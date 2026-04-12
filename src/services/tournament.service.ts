import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Tournament, TournamentFormData, Match } from '../types';
import FixtureGenerator from '../utils/fixtureGenerator';

class TournamentService {
  private tournamentsCollection = collection(db, 'tournaments');
  private matchesCollection = collection(db, 'matches');

  /**
   * Create a new tournament
   */
  /**
   * Generate a unique 6-character invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createTournament(
    createdBy: string,
    data: TournamentFormData
  ): Promise<string> {
    try {
      const tournamentRef = doc(this.tournamentsCollection);
      const inviteCode = this.generateInviteCode();

      const tournament: any = {
        id: tournamentRef.id,
        name: data.name,
        format: data.format,
        teamSize: data.teamSize,
        numberOfTeams: data.numberOfTeams || 4,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        status: 'UPCOMING',
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchDuration: data.matchDuration || 90,
        createdBy,
        organizerIds: data.organizerIds || [createdBy],
        scorerIds: data.organizerIds || [createdBy],
        teamIds: [],
        inviteCode,
        createdAt: serverTimestamp() as any,
      };

      // Only include optional fields if they exist and have valid values
      if ('numberOfGroups' in data && typeof data.numberOfGroups === 'number' && data.numberOfGroups > 0) {
        tournament.numberOfGroups = data.numberOfGroups;
      }
      if ('logoURL' in data && data.logoURL && typeof data.logoURL === 'string' && data.logoURL.trim()) {
        tournament.logoURL = data.logoURL.trim();
      }
      if ('homeTeamId' in data && data.homeTeamId && typeof data.homeTeamId === 'string' && data.homeTeamId.trim()) {
        tournament.homeTeamId = data.homeTeamId.trim();
      }

      await setDoc(tournamentRef, tournament);
      return tournamentRef.id;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw new Error('Failed to create tournament');
    }
  }

  /**
   * Get tournament by ID
   */
  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);

      if (tournamentSnap.exists()) {
        return { ...tournamentSnap.data(), id: tournamentSnap.id } as Tournament;
      }

      return null;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return null;
    }
  }

  /**
   * Get all tournaments (public access)
   */
  async getAllTournaments(): Promise<Tournament[]> {
    try {
      const q = query(this.tournamentsCollection, orderBy('startDate', 'desc'));
      const querySnapshot = await getDocs(q);

      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ ...doc.data(), id: doc.id } as Tournament);
      });

      return tournaments;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
  }

  /**
   * Get tournaments by status
   */
  async getTournamentsByStatus(status: 'UPCOMING' | 'ONGOING' | 'COMPLETED'): Promise<Tournament[]> {
    try {
      const q = query(
        this.tournamentsCollection,
        where('status', '==', status),
        orderBy('startDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ ...doc.data(), id: doc.id } as Tournament);
      });

      return tournaments;
    } catch (error) {
      console.error('Error fetching tournaments by status:', error);
      return [];
    }
  }

  /**
   * Get tournaments where user is an organizer
   */
  async getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]> {
    try {
      const q = query(
        this.tournamentsCollection,
        where('organizerIds', 'array-contains', organizerId),
        orderBy('startDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ ...doc.data(), id: doc.id } as Tournament);
      });

      return tournaments;
    } catch (error) {
      console.error('Error fetching tournaments by organizer:', error);
      return [];
    }
  }

  /**
   * Update tournament
   */
  async updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, data);
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw new Error('Failed to update tournament');
    }
  }

  /**
   * Delete tournament
   */
  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      // Delete all matches for this tournament
      const matchesQuery = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);

      const deletePromises = matchesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete tournament
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await deleteDoc(tournamentRef);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw new Error('Failed to delete tournament');
    }
  }

  /**
   * Add team to tournament
   */
  async addTeamToTournament(tournamentId: string, teamId: string): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (!tournament.teamIds.includes(teamId)) {
        await this.updateTournament(tournamentId, {
          teamIds: [...tournament.teamIds, teamId],
        });
      }
    } catch (error) {
      console.error('Error adding team to tournament:', error);
      throw new Error('Failed to add team to tournament');
    }
  }

  /**
   * Remove team from tournament
   */
  async removeTeamFromTournament(tournamentId: string, teamId: string): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      await this.updateTournament(tournamentId, {
        teamIds: tournament.teamIds.filter((id) => id !== teamId),
      });
    } catch (error) {
      console.error('Error removing team from tournament:', error);
      throw new Error('Failed to remove team from tournament');
    }
  }

  /**
   * Generate fixtures for tournament
   */
  async generateFixtures(
    tournamentId: string,
    scheduling?: { daysBetweenMatches: number; restDaysBetweenRounds?: number }
  ): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.teamIds.length < 2) {
        throw new Error('At least 2 teams required to generate fixtures');
      }

      // Convert Firestore Timestamp to Date properly
      let startDate: Date;
      if (tournament.startDate instanceof Date) {
        startDate = tournament.startDate;
      } else if (tournament.startDate && typeof tournament.startDate === 'object' && 'toDate' in tournament.startDate) {
        // Firestore Timestamp
        startDate = (tournament.startDate as any).toDate();
      } else if (tournament.startDate) {
        // String or number
        startDate = new Date(tournament.startDate);
      } else {
        // No start date, use today
        startDate = new Date();
      }

      // Validate the date
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid tournament start date');
      }

      const fixtures = FixtureGenerator.generateFixtures({
        tournamentId,
        teams: tournament.teamIds,
        format: tournament.format,
        startDate,
        venue: tournament.location,
        numberOfGroups: tournament.numberOfGroups,
        scheduling,
      });

      console.log(`📅 Generating ${fixtures.length} fixtures for tournament ${tournament.name}`);

      // Save all matches to Firestore
      const savePromises = fixtures.map((match) => {
        const matchRef = doc(this.matchesCollection);

        // Remove undefined fields (Firestore doesn't allow undefined)
        const matchData: any = { ...match, id: matchRef.id };
        Object.keys(matchData).forEach(key => {
          if (matchData[key] === undefined) {
            delete matchData[key];
          }
        });

        return setDoc(matchRef, matchData);
      });

      await Promise.all(savePromises);
      console.log(`✅ Successfully created ${fixtures.length} matches`);

      // Update tournament status
      await this.updateTournament(tournamentId, {
        status: 'ONGOING',
      });
    } catch (error) {
      console.error('Error generating fixtures:', error);
      throw new Error('Failed to generate fixtures');
    }
  }

  /**
   * Get tournaments created by user
   */
  async getTournamentsByCreator(creatorId: string): Promise<Tournament[]> {
    try {
      const q = query(
        this.tournamentsCollection,
        where('createdBy', '==', creatorId),
        orderBy('startDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ ...doc.data(), id: doc.id } as Tournament);
      });

      return tournaments;
    } catch (error) {
      console.error('Error fetching creator tournaments:', error);
      return [];
    }
  }

  /**
   * Add organizer to tournament
   */
  async addOrganizer(tournamentId: string, organizerId: string): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (!tournament.organizerIds.includes(organizerId)) {
        await this.updateTournament(tournamentId, {
          organizerIds: [...tournament.organizerIds, organizerId],
        });
      }
    } catch (error) {
      console.error('Error adding organizer:', error);
      throw new Error('Failed to add organizer');
    }
  }

  /**
   * Remove organizer from tournament
   */
  async removeOrganizer(tournamentId: string, organizerId: string): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Don't allow removing the creator
      if (tournament.createdBy === organizerId) {
        throw new Error('Cannot remove tournament creator');
      }

      await this.updateTournament(tournamentId, {
        organizerIds: tournament.organizerIds.filter((id) => id !== organizerId),
      });
    } catch (error) {
      console.error('Error removing organizer:', error);
      throw new Error('Failed to remove organizer');
    }
  }

  /**
   * Create a manual match for tournament
   */
  async createManualMatch(
    tournamentId: string,
    matchData: {
      homeTeamId: string;
      awayTeamId: string;
      stage: string;
      groupName?: string;
      matchDate: Date;
      venue: string;
      extraTimeDuration?: number;
    }
  ): Promise<string> {
    try {
      const matchRef = doc(this.matchesCollection);

      const match: any = {
        id: matchRef.id,
        tournamentId,
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        stage: matchData.stage,
        matchDate: matchData.matchDate,
        venue: matchData.venue,
        status: 'SCHEDULED',
        score: {
          home: 0,
          away: 0,
        },
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      // Only include optional fields if they have values
      if (matchData.groupName) {
        match.groupName = matchData.groupName;
      }
      if (matchData.extraTimeDuration) {
        match.extraTimeDuration = matchData.extraTimeDuration;
      }

      await setDoc(matchRef, match);
      console.log('✅ Manual match created:', matchRef.id);
      return matchRef.id;
    } catch (error) {
      console.error('Error creating manual match:', error);
      throw new Error('Failed to create manual match');
    }
  }

  /**
   * Upload tournament logo
   */
  async uploadTournamentLogo(tournamentId: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, `tournaments/${tournamentId}/logo.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await this.updateTournament(tournamentId, { logoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading tournament logo:', error);
      throw new Error('Failed to upload tournament logo');
    }
  }
}

export default new TournamentService();

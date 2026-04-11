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
import { db } from './firebase';
import { Tournament, TournamentFormData, Match } from '../types';
import FixtureGenerator from '../utils/fixtureGenerator';

class TournamentService {
  private tournamentsCollection = collection(db, 'tournaments');
  private matchesCollection = collection(db, 'matches');

  /**
   * Create a new tournament
   */
  async createTournament(
    createdBy: string,
    data: TournamentFormData
  ): Promise<string> {
    try {
      const tournamentRef = doc(this.tournamentsCollection);
      const tournament: Tournament = {
        id: tournamentRef.id,
        name: data.name,
        format: data.format,
        teamSize: data.teamSize,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        status: 'UPCOMING',
        numberOfGroups: data.numberOfGroups,
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        createdBy,
        teamIds: [],
        createdAt: serverTimestamp() as any,
      };

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
  async generateFixtures(tournamentId: string): Promise<void> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.teamIds.length < 2) {
        throw new Error('At least 2 teams required to generate fixtures');
      }

      const fixtures = FixtureGenerator.generateFixtures({
        tournamentId,
        teams: tournament.teamIds,
        format: tournament.format,
        startDate: tournament.startDate as any,
        venue: tournament.location,
        numberOfGroups: tournament.numberOfGroups,
      });

      // Save all matches to Firestore
      const savePromises = fixtures.map((match) => {
        const matchRef = doc(this.matchesCollection);
        return setDoc(matchRef, { ...match, id: matchRef.id });
      });

      await Promise.all(savePromises);

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
}

export default new TournamentService();

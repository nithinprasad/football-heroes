import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Match, MatchResultFormData, PlayerMatchStats } from '../types';

class MatchService {
  private matchesCollection = collection(db, 'matches');

  /**
   * Get match by ID (public access)
   */
  async getMatchById(matchId: string): Promise<Match | null> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);

      if (matchSnap.exists()) {
        return { ...matchSnap.data(), id: matchSnap.id } as Match;
      }

      return null;
    } catch (error) {
      console.error('Error fetching match:', error);
      return null;
    }
  }

  /**
   * Get matches for a tournament (public access)
   */
  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    try {
      const q = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId),
        orderBy('matchDate', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const matches: Match[] = [];
      querySnapshot.forEach((doc) => {
        matches.push({ ...doc.data(), id: doc.id } as Match);
      });

      return matches;
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }

  /**
   * Get matches by team (public access)
   */
  async getMatchesByTeam(teamId: string): Promise<Match[]> {
    try {
      const q1 = query(
        this.matchesCollection,
        where('homeTeamId', '==', teamId)
      );
      const q2 = query(
        this.matchesCollection,
        where('awayTeamId', '==', teamId)
      );

      const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
      ]);

      const matches: Match[] = [];
      const matchIds = new Set<string>();

      homeSnapshot.forEach((doc) => {
        if (!matchIds.has(doc.id)) {
          matches.push({ ...doc.data(), id: doc.id } as Match);
          matchIds.add(doc.id);
        }
      });

      awaySnapshot.forEach((doc) => {
        if (!matchIds.has(doc.id)) {
          matches.push({ ...doc.data(), id: doc.id } as Match);
          matchIds.add(doc.id);
        }
      });

      // Sort by date
      matches.sort((a, b) => {
        const dateA = a.matchDate instanceof Date ? a.matchDate : new Date(a.matchDate as any);
        const dateB = b.matchDate instanceof Date ? b.matchDate : new Date(b.matchDate as any);
        return dateA.getTime() - dateB.getTime();
      });

      return matches;
    } catch (error) {
      console.error('Error fetching team matches:', error);
      return [];
    }
  }

  /**
   * Get upcoming matches (public access)
   */
  async getUpcomingMatches(limit: number = 10): Promise<Match[]> {
    try {
      const now = new Date();
      const q = query(
        this.matchesCollection,
        where('status', '==', 'SCHEDULED'),
        where('matchDate', '>=', now),
        orderBy('matchDate', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const matches: Match[] = [];
      querySnapshot.forEach((doc) => {
        if (matches.length < limit) {
          matches.push({ ...doc.data(), id: doc.id } as Match);
        }
      });

      return matches;
    } catch (error) {
      console.error('Error fetching upcoming matches:', error);
      return [];
    }
  }

  /**
   * Get live/ongoing matches (public access)
   */
  async getLiveMatches(): Promise<Match[]> {
    try {
      const q = query(
        this.matchesCollection,
        where('status', '==', 'ONGOING'),
        orderBy('matchDate', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const matches: Match[] = [];
      querySnapshot.forEach((doc) => {
        matches.push({ ...doc.data(), id: doc.id } as Match);
      });

      return matches;
    } catch (error) {
      console.error('Error fetching live matches:', error);
      return [];
    }
  }

  /**
   * Update match score (admin/organizer only)
   */
  async updateMatchScore(matchId: string, result: MatchResultFormData): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        'score.home': result.homeScore,
        'score.away': result.awayScore,
        playerStats: result.playerStats,
        status: 'COMPLETED',
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating match score:', error);
      throw new Error('Failed to update match score');
    }
  }

  /**
   * Update match status (admin/organizer only)
   */
  async updateMatchStatus(
    matchId: string,
    status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  ): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating match status:', error);
      throw new Error('Failed to update match status');
    }
  }

  /**
   * Add player stats to match (admin/organizer only)
   */
  async addPlayerStats(matchId: string, playerStats: PlayerMatchStats[]): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const match = await this.getMatchById(matchId);

      if (!match) {
        throw new Error('Match not found');
      }

      const existingStats = match.playerStats || [];
      const updatedStats = [...existingStats];

      playerStats.forEach((newStat) => {
        const existingIndex = updatedStats.findIndex(
          (stat) => stat.playerId === newStat.playerId
        );

        if (existingIndex >= 0) {
          // Update existing stats
          updatedStats[existingIndex] = {
            ...updatedStats[existingIndex],
            goals: updatedStats[existingIndex].goals + newStat.goals,
            assists: updatedStats[existingIndex].assists + newStat.assists,
            yellowCards: updatedStats[existingIndex].yellowCards + newStat.yellowCards,
            redCards: updatedStats[existingIndex].redCards + newStat.redCards,
            cleanSheet: newStat.cleanSheet || updatedStats[existingIndex].cleanSheet,
          };
        } else {
          // Add new stats
          updatedStats.push(newStat);
        }
      });

      await updateDoc(matchRef, {
        playerStats: updatedStats,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error adding player stats:', error);
      throw new Error('Failed to add player stats');
    }
  }

  /**
   * Get completed matches for standings calculation (public access)
   */
  async getCompletedMatchesByTournament(tournamentId: string): Promise<Match[]> {
    try {
      const q = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId),
        where('status', '==', 'COMPLETED'),
        orderBy('matchDate', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const matches: Match[] = [];
      querySnapshot.forEach((doc) => {
        matches.push({ ...doc.data(), id: doc.id } as Match);
      });

      return matches;
    } catch (error) {
      console.error('Error fetching completed matches:', error);
      return [];
    }
  }
}

export default new MatchService();

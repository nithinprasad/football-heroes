import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Match, MatchResultFormData, PlayerMatchStats } from '../types';
import userService from './user.service';

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
   * Create a standalone match (not part of a tournament)
   */
  async createStandaloneMatch(matchData: {
    homeTeamId: string;
    awayTeamId: string;
    matchDate: Date;
    venue: string;
    matchDuration: number;
    createdBy: string;
  }): Promise<string> {
    try {
      const matchRef = doc(this.matchesCollection);

      // Build match object without undefined fields (Firestore doesn't allow undefined)
      const match: any = {
        id: matchRef.id,
        // tournamentId is omitted for standalone matches (not undefined)
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        stage: 'GROUP', // Default stage for standalone
        matchDate: matchData.matchDate,
        venue: matchData.venue,
        status: 'SCHEDULED',
        score: { home: 0, away: 0 },
        playerStats: [],
        createdBy: matchData.createdBy,
        matchDuration: matchData.matchDuration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('⚽ Creating standalone match:', {
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        venue: matchData.venue,
      });

      await setDoc(matchRef, match);
      console.log('✅ Standalone match created successfully:', matchRef.id);
      return matchRef.id;
    } catch (error) {
      console.error('Error creating standalone match:', error);
      throw new Error('Failed to create match');
    }
  }

  /**
   * Update match score (admin/organizer only)
   */
  async updateMatchScore(matchId: string, result: MatchResultFormData, completeMatch: boolean = true): Promise<void> {
    try {
      const logMessage = completeMatch ? '🏁 Ending match and saving final score:' : '⚽ Updating match score:';
      console.log(logMessage, {
        matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        statsCount: result.playerStats.length,
      });

      const matchRef = doc(db, 'matches', matchId);
      const match = await this.getMatchById(matchId);

      // Clean player stats to remove undefined fields
      const cleanedStats = result.playerStats.map((stat) => {
        const cleaned: any = {
          playerId: stat.playerId,
          goals: stat.goals,
          assists: stat.assists,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards,
        };

        // Only include cleanSheet if it has a value
        if (stat.cleanSheet !== undefined) {
          cleaned.cleanSheet = stat.cleanSheet;
        }

        // Include events if they exist
        if (stat.events && stat.events.length > 0) {
          cleaned.events = stat.events.map((event) => {
            const cleanedEvent: any = {
              type: event.type,
              timestamp: event.timestamp,
            };
            if (event.minute !== undefined) {
              cleanedEvent.minute = event.minute;
            }
            return cleanedEvent;
          });
        }

        return cleaned;
      });

      const updateData: any = {
        'score.home': result.homeScore,
        'score.away': result.awayScore,
        playerStats: cleanedStats,
        updatedAt: new Date(),
      };

      // Only set status to COMPLETED if explicitly ending the match
      if (completeMatch) {
        updateData.status = 'COMPLETED';
      }

      await updateDoc(matchRef, updateData);

      console.log(completeMatch ? '✅ Match completed successfully' : '✅ Match score updated');

      // Update player statistics only when match is being completed
      if (completeMatch && match && match.status !== 'COMPLETED') {
        console.log('📊 Updating player statistics for match:', matchId);
        console.log('Match status before:', match.status);
        console.log('Player stats to update:', result.playerStats);

        const eligiblePlayers = result.playerStats.filter(stat => !stat.playerId.startsWith('guest_'));
        console.log('Eligible players (excluding guests):', eligiblePlayers);

        const updatePromises = eligiblePlayers.map((stat) => {
          console.log(`Updating stats for player ${stat.playerId}:`, {
            goals: stat.goals,
            assists: stat.assists,
            yellowCards: stat.yellowCards,
            redCards: stat.redCards,
            cleanSheets: stat.cleanSheet ? 1 : 0,
          });

          return userService.updateUserStats(stat.playerId, {
            goals: stat.goals,
            assists: stat.assists,
            yellowCards: stat.yellowCards,
            redCards: stat.redCards,
            cleanSheets: stat.cleanSheet ? 1 : 0,
          });
        });

        await Promise.all(updatePromises);
        console.log('✅ All player statistics updated successfully');
      } else {
        console.log('⏭️ Skipping player stats update:', {
          completeMatch,
          matchExists: !!match,
          matchStatus: match?.status,
          reason: !completeMatch ? 'Not completing match' : match?.status === 'COMPLETED' ? 'Match already completed' : 'Unknown',
        });
      }
    } catch (error) {
      console.error('❌ Error updating match score:', error);
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
      console.log('⚽ Adding player stats to match:', matchId, playerStats);
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
          const updated: any = {
            playerId: updatedStats[existingIndex].playerId,
            goals: updatedStats[existingIndex].goals + newStat.goals,
            assists: updatedStats[existingIndex].assists + newStat.assists,
            yellowCards: updatedStats[existingIndex].yellowCards + newStat.yellowCards,
            redCards: updatedStats[existingIndex].redCards + newStat.redCards,
          };

          // Only include cleanSheet if it has a value
          if (newStat.cleanSheet !== undefined || updatedStats[existingIndex].cleanSheet !== undefined) {
            updated.cleanSheet = newStat.cleanSheet || updatedStats[existingIndex].cleanSheet;
          }

          // Merge events
          if (newStat.events || updatedStats[existingIndex].events) {
            updated.events = [
              ...(updatedStats[existingIndex].events || []),
              ...(newStat.events || []),
            ].map((event) => {
              const cleanedEvent: any = {
                type: event.type,
                timestamp: event.timestamp,
              };
              if (event.minute !== undefined) {
                cleanedEvent.minute = event.minute;
              }
              return cleanedEvent;
            });
          }

          updatedStats[existingIndex] = updated;
        } else {
          // Add new stats - remove undefined fields
          const newStatClean: any = {
            playerId: newStat.playerId,
            goals: newStat.goals,
            assists: newStat.assists,
            yellowCards: newStat.yellowCards,
            redCards: newStat.redCards,
          };

          // Only include cleanSheet if it has a value
          if (newStat.cleanSheet !== undefined) {
            newStatClean.cleanSheet = newStat.cleanSheet;
          }

          // Include events if they exist
          if (newStat.events && newStat.events.length > 0) {
            newStatClean.events = newStat.events.map((event) => {
              const cleanedEvent: any = {
                type: event.type,
                timestamp: event.timestamp,
              };
              if (event.minute !== undefined) {
                cleanedEvent.minute = event.minute;
              }
              return cleanedEvent;
            });
          }

          updatedStats.push(newStatClean);
        }
      });

      await updateDoc(matchRef, {
        playerStats: updatedStats,
        updatedAt: new Date(),
      });

      console.log('✅ Player stats added successfully. Total stats:', updatedStats.length);
    } catch (error) {
      console.error('❌ Error adding player stats:', error);
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

  /**
   * Update only player stats without changing score
   */
  async updateMatchPlayerStats(matchId: string, playerStats: PlayerMatchStats[]): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);

      // Clean player stats to remove undefined fields
      const cleanedStats = playerStats.map((stat) => {
        const cleaned: any = {
          playerId: stat.playerId,
          goals: stat.goals,
          assists: stat.assists,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards,
        };

        if (stat.cleanSheet !== undefined) {
          cleaned.cleanSheet = stat.cleanSheet;
        }

        if (stat.events && stat.events.length > 0) {
          cleaned.events = stat.events.map((event) => {
            const cleanedEvent: any = {
              type: event.type,
              timestamp: event.timestamp,
            };
            if (event.minute !== undefined) {
              cleanedEvent.minute = event.minute;
            }
            return cleanedEvent;
          });
        }

        return cleaned;
      });

      await updateDoc(matchRef, {
        playerStats: cleanedStats,
        updatedAt: new Date(),
      });

      console.log('✅ Player stats updated successfully');
    } catch (error) {
      console.error('❌ Error updating player stats:', error);
      throw new Error('Failed to update player stats');
    }
  }

  /**
   * Delete match (creator only)
   */
  async deleteMatch(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status: 'CANCELLED',
        updatedAt: new Date(),
      });
      console.log('✅ Match cancelled successfully');
    } catch (error) {
      console.error('❌ Error deleting match:', error);
      throw new Error('Failed to delete match');
    }
  }
}

export default new MatchService();

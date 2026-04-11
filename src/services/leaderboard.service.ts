import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from './firebase';
import { TopScorer, TopAssist, TopGoalkeeper, User } from '../types';
import userService from './user.service';

class LeaderboardService {
  /**
   * Get top scorers across all tournaments
   */
  async getTopScorers(limitCount: number = 10): Promise<TopScorer[]> {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection,
        orderBy('statistics.goals', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const topScorers: TopScorer[] = [];

      querySnapshot.forEach((doc) => {
        const user = doc.data() as User;
        if (user.statistics.goals > 0) {
          topScorers.push({
            playerId: doc.id,
            playerName: user.name,
            photoURL: user.photoURL,
            teamId: user.teamIds[0] || '',
            teamName: '', // Will be populated if needed
            goals: user.statistics.goals,
            matches: user.statistics.matches,
          });
        }
      });

      return topScorers;
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      return [];
    }
  }

  /**
   * Get top assist providers
   */
  async getTopAssists(limitCount: number = 10): Promise<TopAssist[]> {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection,
        orderBy('statistics.assists', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const topAssists: TopAssist[] = [];

      querySnapshot.forEach((doc) => {
        const user = doc.data() as User;
        if (user.statistics.assists > 0) {
          topAssists.push({
            playerId: doc.id,
            playerName: user.name,
            photoURL: user.photoURL,
            teamId: user.teamIds[0] || '',
            teamName: '', // Will be populated if needed
            assists: user.statistics.assists,
            matches: user.statistics.matches,
          });
        }
      });

      return topAssists;
    } catch (error) {
      console.error('Error fetching top assists:', error);
      return [];
    }
  }

  /**
   * Get top goalkeepers (by clean sheets)
   */
  async getTopGoalkeepers(limitCount: number = 10): Promise<TopGoalkeeper[]> {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(
        usersCollection,
        where('position', '==', 'Goalkeeper'),
        orderBy('statistics.cleanSheets', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const topGoalkeepers: TopGoalkeeper[] = [];

      querySnapshot.forEach((doc) => {
        const user = doc.data() as User;
        if (user.statistics.cleanSheets > 0) {
          topGoalkeepers.push({
            playerId: doc.id,
            playerName: user.name,
            photoURL: user.photoURL,
            teamId: user.teamIds[0] || '',
            teamName: '', // Will be populated if needed
            cleanSheets: user.statistics.cleanSheets,
            matches: user.statistics.matches,
            goalsConceded: 0, // Calculate from matches if needed
          });
        }
      });

      return topGoalkeepers;
    } catch (error) {
      console.error('Error fetching top goalkeepers:', error);
      return [];
    }
  }

  /**
   * Get all leaderboards at once
   */
  async getAllLeaderboards(limitCount: number = 10) {
    try {
      const [topScorers, topAssists, topGoalkeepers] = await Promise.all([
        this.getTopScorers(limitCount),
        this.getTopAssists(limitCount),
        this.getTopGoalkeepers(limitCount),
      ]);

      return {
        topScorers,
        topAssists,
        topGoalkeepers,
      };
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      return {
        topScorers: [],
        topAssists: [],
        topGoalkeepers: [],
      };
    }
  }
}

export default new LeaderboardService();

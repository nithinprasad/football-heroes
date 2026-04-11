import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { User } from '../types';

class UserService {
  private usersCollection = collection(db, 'users');

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return { ...userSnap.data(), id: userSnap.id } as User;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user by mobile number
   */
  async getUserByMobileNumber(mobileNumber: string): Promise<User | null> {
    try {
      const q = query(this.usersCollection, where('mobileNumber', '==', mobileNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...userDoc.data(), id: userDoc.id } as User;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user by mobile:', error);
      return null;
    }
  }

  /**
   * Get multiple users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    try {
      const users: User[] = [];

      for (const userId of userIds) {
        const user = await this.getUserById(userId);
        if (user) {
          users.push(user);
        }
      }

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Upload user profile photo
   */
  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, `users/${userId}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user profile with new photo URL
      await this.updateUser(userId, { photoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw new Error('Failed to upload profile photo');
    }
  }

  /**
   * Add team to user's team list
   */
  async addTeamToUser(userId: string, teamId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.teamIds.includes(teamId)) {
        await this.updateUser(userId, {
          teamIds: [...user.teamIds, teamId],
        });
      }
    } catch (error) {
      console.error('Error adding team to user:', error);
      throw new Error('Failed to add team to user');
    }
  }

  /**
   * Remove team from user's team list
   */
  async removeTeamFromUser(userId: string, teamId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.updateUser(userId, {
        teamIds: user.teamIds.filter((id) => id !== teamId),
      });
    } catch (error) {
      console.error('Error removing team from user:', error);
      throw new Error('Failed to remove team from user');
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: string,
    stats: {
      goals?: number;
      assists?: number;
      yellowCards?: number;
      redCards?: number;
      cleanSheets?: number;
    }
  ): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedStats = {
        matches: user.statistics.matches + 1,
        goals: user.statistics.goals + (stats.goals || 0),
        assists: user.statistics.assists + (stats.assists || 0),
        yellowCards: user.statistics.yellowCards + (stats.yellowCards || 0),
        redCards: user.statistics.redCards + (stats.redCards || 0),
        cleanSheets: user.statistics.cleanSheets + (stats.cleanSheets || 0),
      };

      await this.updateUser(userId, { statistics: updatedStats });
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw new Error('Failed to update user statistics');
    }
  }

  /**
   * Search users by name
   */
  async searchUsersByName(searchTerm: string): Promise<User[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation that gets all users and filters
      // For production, consider using Algolia or similar service
      const querySnapshot = await getDocs(this.usersCollection);
      const users: User[] = [];

      querySnapshot.forEach((doc) => {
        const user = { ...doc.data(), id: doc.id } as User;
        if (user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push(user);
        }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
}

export default new UserService();

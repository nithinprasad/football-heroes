import {
  collection,
  doc,
  setDoc,
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
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      console.log('Updating user:', userId, 'with data:', updateData);
      await updateDoc(userRef, updateData);
      console.log('✅ User updated successfully:', userId);
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error; // Re-throw original error for better debugging
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
    console.log('🔵 Adding team', teamId, 'to user', userId);

    let user = await this.getUserById(userId);

    // If user doesn't exist in Firestore, create a basic profile
    if (!user) {
      console.log('⚠️ User document not found, creating one for:', userId);
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        id: userId,
        name: 'User',
        mobileNumber: '',
        roles: ['player'],
        teamIds: [teamId],
        statistics: {
          matches: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Basic profile created with team');
      return;
    }

    if (!user.teamIds.includes(teamId)) {
      console.log('🔄 User exists, updating teamIds. Current teams:', user.teamIds);
      await this.updateUser(userId, {
        teamIds: [...user.teamIds, teamId],
      });
      console.log('✅ Team added to user successfully');
    } else {
      console.log('ℹ️ User already has this team');
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
      console.log(`📈 Updating stats for user ${userId}:`, stats);

      const user = await this.getUserById(userId);
      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        throw new Error('User not found');
      }

      console.log(`Current stats for ${user.name}:`, user.statistics);

      const updatedStats = {
        matches: user.statistics.matches + 1,
        goals: user.statistics.goals + (stats.goals || 0),
        assists: user.statistics.assists + (stats.assists || 0),
        yellowCards: user.statistics.yellowCards + (stats.yellowCards || 0),
        redCards: user.statistics.redCards + (stats.redCards || 0),
        cleanSheets: user.statistics.cleanSheets + (stats.cleanSheets || 0),
      };

      console.log(`New stats for ${user.name}:`, updatedStats);

      await this.updateUser(userId, { statistics: updatedStats });
      console.log(`✅ Stats updated successfully for ${user.name}`);
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw new Error('Failed to update user statistics');
    }
  }

  /**
   * Create an unverified user by phone number (for managers adding players)
   */
  async createUnverifiedUser(mobileNumber: string, name?: string): Promise<string> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByMobileNumber(mobileNumber);
      if (existingUser) {
        return existingUser.id;
      }

      // Create a unique ID for unverified user (using phone number as base)
      const userId = `unverified_${mobileNumber.replace(/\+/g, '')}`;
      const userRef = doc(db, 'users', userId);

      await setDoc(userRef, {
        id: userId,
        name: name || `User ${mobileNumber}`,
        mobileNumber,
        roles: ['player'],
        teamIds: [],
        statistics: {
          matches: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
        },
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return userId;
    } catch (error) {
      console.error('Error creating unverified user:', error);
      throw new Error('Failed to create unverified user');
    }
  }

  /**
   * Verify and merge an unverified user profile with authenticated user
   */
  async verifyUser(mobileNumber: string, authenticatedUserId: string): Promise<void> {
    try {
      // Find unverified user by phone number
      const unverifiedUserId = `unverified_${mobileNumber.replace(/\+/g, '')}`;
      const unverifiedUser = await this.getUserById(unverifiedUserId);

      if (!unverifiedUser) {
        // No unverified profile exists, nothing to merge
        return;
      }

      // Get authenticated user
      const authUser = await this.getUserById(authenticatedUserId);
      if (!authUser) {
        return;
      }

      // Merge data from unverified to authenticated user
      await this.updateUser(authenticatedUserId, {
        teamIds: [...new Set([...authUser.teamIds, ...unverifiedUser.teamIds])],
        statistics: {
          matches: authUser.statistics.matches + unverifiedUser.statistics.matches,
          goals: authUser.statistics.goals + unverifiedUser.statistics.goals,
          assists: authUser.statistics.assists + unverifiedUser.statistics.assists,
          cleanSheets: authUser.statistics.cleanSheets + unverifiedUser.statistics.cleanSheets,
          yellowCards: authUser.statistics.yellowCards + unverifiedUser.statistics.yellowCards,
          redCards: authUser.statistics.redCards + unverifiedUser.statistics.redCards,
        },
        isVerified: true,
      });

      // TODO: Update all references to unverified user ID with authenticated user ID
      // This would involve updating team rosters, match stats, etc.
      // For now, we'll leave the unverified profile as is for reference
    } catch (error) {
      console.error('Error verifying user:', error);
      throw new Error('Failed to verify user');
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

  /**
   * Search users by name or phone number
   */
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(this.usersCollection);
      const users: User[] = [];
      const search = searchTerm.toLowerCase().replace(/\s+/g, '');

      querySnapshot.forEach((doc) => {
        const user = { ...doc.data(), id: doc.id } as User;
        const userName = (user.name || '').toLowerCase();
        const userPhone = (user.mobileNumber || '').replace(/\s+/g, '').replace(/\D/g, '');
        const searchPhone = searchTerm.replace(/\s+/g, '').replace(/\D/g, '');

        // Match by name or phone number
        if (
          userName.includes(searchTerm.toLowerCase()) ||
          userPhone.includes(searchPhone)
        ) {
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

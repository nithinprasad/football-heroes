import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  getDoc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Follow {
  id: string;
  followerId: string; // User who is following
  followingId: string; // User being followed
  createdAt: Date;
}

class FollowService {
  private followsCollection = collection(db, 'follows');

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    try {
      const followId = `${followerId}_${followingId}`;
      const followRef = doc(this.followsCollection, followId);

      // Check if already following
      const existingFollow = await getDoc(followRef);
      if (existingFollow.exists()) {
        console.log('Already following this user');
        return;
      }

      const batch = writeBatch(db);

      // Create follow document
      batch.set(followRef, {
        id: followId,
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });

      // Update follower count for the user being followed
      const followingUserRef = doc(db, 'users', followingId);
      batch.update(followingUserRef, {
        'statistics.followers': increment(1),
      });

      // Update following count for the follower
      const followerUserRef = doc(db, 'users', followerId);
      batch.update(followerUserRef, {
        'statistics.following': increment(1),
      });

      await batch.commit();
      console.log('✅ Successfully followed user');
    } catch (error) {
      console.error('Error following user:', error);
      throw new Error('Failed to follow user');
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      const followId = `${followerId}_${followingId}`;
      const followRef = doc(this.followsCollection, followId);

      // Check if follow exists
      const existingFollow = await getDoc(followRef);
      if (!existingFollow.exists()) {
        console.log('Not following this user');
        return;
      }

      const batch = writeBatch(db);

      // Delete follow document
      batch.delete(followRef);

      // Update follower count for the user being unfollowed
      const followingUserRef = doc(db, 'users', followingId);
      batch.update(followingUserRef, {
        'statistics.followers': increment(-1),
      });

      // Update following count for the follower
      const followerUserRef = doc(db, 'users', followerId);
      batch.update(followerUserRef, {
        'statistics.following': increment(-1),
      });

      await batch.commit();
      console.log('✅ Successfully unfollowed user');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw new Error('Failed to unfollow user');
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const followId = `${followerId}_${followingId}`;
      const followRef = doc(this.followsCollection, followId);
      const followDoc = await getDoc(followRef);
      return followDoc.exists();
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string): Promise<string[]> {
    try {
      const q = query(this.followsCollection, where('followerId', '==', userId));
      const querySnapshot = await getDocs(q);

      const following: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        following.push(data.followingId);
      });

      return following;
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  /**
   * Get users who follow a user (followers)
   */
  async getFollowers(userId: string): Promise<string[]> {
    try {
      const q = query(this.followsCollection, where('followingId', '==', userId));
      const querySnapshot = await getDocs(q);

      const followers: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        followers.push(data.followerId);
      });

      return followers;
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  /**
   * Get follower and following counts
   */
  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    try {
      const [followers, following] = await Promise.all([
        this.getFollowers(userId),
        this.getFollowing(userId),
      ]);

      return {
        followers: followers.length,
        following: following.length,
      };
    } catch (error) {
      console.error('Error getting follow counts:', error);
      return { followers: 0, following: 0 };
    }
  }
}

export default new FollowService();

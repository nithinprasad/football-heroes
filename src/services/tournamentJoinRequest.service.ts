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
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { TournamentJoinRequest, JoinRequestStatus } from '../types';

class TournamentJoinRequestService {
  private requestsCollection = collection(db, 'tournamentJoinRequests');

  /**
   * Create a join request for a tournament
   */
  async createJoinRequest(
    tournamentId: string,
    teamId: string,
    teamName: string,
    requestedBy: string,
    requestedByName: string,
    message?: string
  ): Promise<string> {
    try {
      // Check if there's already a pending request
      const existingRequests = await this.getRequestsByTournamentAndTeam(tournamentId, teamId);
      const pendingRequest = existingRequests.find((req) => req.status === 'PENDING');

      if (pendingRequest) {
        throw new Error('You already have a pending request for this tournament');
      }

      const requestRef = doc(this.requestsCollection);
      const requestData = {
        id: requestRef.id,
        tournamentId,
        teamId,
        teamName,
        requestedBy,
        requestedByName,
        status: 'PENDING' as JoinRequestStatus,
        message: message || '',
        createdAt: serverTimestamp(),
      };

      await setDoc(requestRef, requestData);
      return requestRef.id;
    } catch (error) {
      console.error('Error creating join request:', error);
      throw error;
    }
  }

  /**
   * Get all join requests for a tournament
   */
  async getRequestsByTournament(tournamentId: string): Promise<TournamentJoinRequest[]> {
    try {
      const q = query(
        this.requestsCollection,
        where('tournamentId', '==', tournamentId)
      );
      const querySnapshot = await getDocs(q);

      // Sort in memory instead of in query (avoids need for index)
      const requests = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate(),
        } as TournamentJoinRequest;
      });

      // Sort by createdAt descending
      return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching join requests:', error);
      return [];
    }
  }

  /**
   * Get join requests by tournament and team
   */
  async getRequestsByTournamentAndTeam(
    tournamentId: string,
    teamId: string
  ): Promise<TournamentJoinRequest[]> {
    try {
      const q = query(
        this.requestsCollection,
        where('tournamentId', '==', tournamentId),
        where('teamId', '==', teamId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate(),
        } as TournamentJoinRequest;
      });
    } catch (error) {
      console.error('Error fetching join requests:', error);
      return [];
    }
  }

  /**
   * Approve a join request
   */
  async approveRequest(requestId: string, reviewedBy: string): Promise<void> {
    try {
      const requestRef = doc(db, 'tournamentJoinRequests', requestId);
      await updateDoc(requestRef, {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error approving request:', error);
      throw new Error('Failed to approve join request');
    }
  }

  /**
   * Reject a join request
   */
  async rejectRequest(requestId: string, reviewedBy: string): Promise<void> {
    try {
      const requestRef = doc(db, 'tournamentJoinRequests', requestId);
      await updateDoc(requestRef, {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw new Error('Failed to reject join request');
    }
  }

  /**
   * Get pending requests count for a tournament
   */
  async getPendingRequestsCount(tournamentId: string): Promise<number> {
    try {
      const q = query(
        this.requestsCollection,
        where('tournamentId', '==', tournamentId),
        where('status', '==', 'PENDING')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
      return 0;
    }
  }
}

export default new TournamentJoinRequestService();

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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Invitation, InvitationType, InvitationRole, InvitationStatus } from '../types';
import userService from './user.service';
import { nanoid } from 'nanoid';

class InvitationService {
  private invitationsCollection = collection(db, 'invitations');

  /**
   * Create an invitation
   */
  async createInvitation(data: {
    type: InvitationType;
    mobileNumber: string;
    teamId?: string;
    tournamentId?: string;
    role: InvitationRole;
    createdBy: string;
  }): Promise<Invitation> {
    try {
      // Check if user already exists with this mobile number
      const existingUser = await userService.getUserByMobileNumber(data.mobileNumber);

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingInvitation(
        data.mobileNumber,
        data.type,
        data.teamId,
        data.tournamentId
      );

      if (existingInvitation) {
        throw new Error('An invitation already exists for this user');
      }

      const invitationRef = doc(this.invitationsCollection);
      const inviteCode = nanoid(10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation: Invitation = {
        id: invitationRef.id,
        type: data.type,
        mobileNumber: data.mobileNumber,
        userId: existingUser ? existingUser.id : null,
        teamId: data.teamId || null,
        tournamentId: data.tournamentId || null,
        role: data.role,
        status: 'PENDING',
        inviteCode,
        createdBy: data.createdBy,
        createdAt: serverTimestamp() as any,
        expiresAt: Timestamp.fromDate(expiresAt) as any,
      };

      await setDoc(invitationRef, invitation);

      return invitation;
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      throw new Error(error.message || 'Failed to create invitation');
    }
  }

  /**
   * Get pending invitation
   */
  async getPendingInvitation(
    mobileNumber: string,
    type: InvitationType,
    teamId?: string,
    tournamentId?: string
  ): Promise<Invitation | null> {
    try {
      let q = query(
        this.invitationsCollection,
        where('mobileNumber', '==', mobileNumber),
        where('type', '==', type),
        where('status', '==', 'PENDING')
      );

      if (teamId) {
        q = query(q, where('teamId', '==', teamId));
      }

      if (tournamentId) {
        q = query(q, where('tournamentId', '==', tournamentId));
      }

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const invitationDoc = querySnapshot.docs[0];
        return { ...invitationDoc.data(), id: invitationDoc.id } as Invitation;
      }

      return null;
    } catch (error) {
      console.error('Error fetching pending invitation:', error);
      return null;
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(invitationId: string): Promise<Invitation | null> {
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);

      if (invitationSnap.exists()) {
        return { ...invitationSnap.data(), id: invitationSnap.id } as Invitation;
      }

      return null;
    } catch (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }
  }

  /**
   * Get invitation by code
   */
  async getInvitationByCode(inviteCode: string): Promise<Invitation | null> {
    try {
      const q = query(
        this.invitationsCollection,
        where('inviteCode', '==', inviteCode)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const invitationDoc = querySnapshot.docs[0];
        return { ...invitationDoc.data(), id: invitationDoc.id } as Invitation;
      }

      return null;
    } catch (error) {
      console.error('Error fetching invitation by code:', error);
      return null;
    }
  }

  /**
   * Get invitations for a user (by userId or mobile number)
   */
  async getInvitationsForUser(
    userId: string,
    mobileNumber: string
  ): Promise<Invitation[]> {
    try {
      const q1 = query(
        this.invitationsCollection,
        where('userId', '==', userId),
        where('status', '==', 'PENDING')
      );

      const q2 = query(
        this.invitationsCollection,
        where('mobileNumber', '==', mobileNumber),
        where('status', '==', 'PENDING')
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
      ]);

      const invitations: Invitation[] = [];
      const invitationIds = new Set<string>();

      snapshot1.forEach((doc) => {
        if (!invitationIds.has(doc.id)) {
          invitations.push({ ...doc.data(), id: doc.id } as Invitation);
          invitationIds.add(doc.id);
        }
      });

      snapshot2.forEach((doc) => {
        if (!invitationIds.has(doc.id)) {
          invitations.push({ ...doc.data(), id: doc.id } as Invitation);
          invitationIds.add(doc.id);
        }
      });

      return invitations;
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      return [];
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      const invitation = await this.getInvitationById(invitationId);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'PENDING') {
        throw new Error('Invitation is no longer pending');
      }

      // Check if expired
      const now = new Date();
      const expiresAt = (invitation.expiresAt as any).toDate();
      if (now > expiresAt) {
        await this.updateInvitationStatus(invitationId, 'EXPIRED');
        throw new Error('Invitation has expired');
      }

      // Update invitation status
      await this.updateInvitationStatus(invitationId, 'ACCEPTED', userId);

      // Handle team invitation
      if (invitation.type === 'TEAM' && invitation.teamId) {
        const teamService = (await import('./team.service')).default;
        await teamService.addPlayerToTeam(invitation.teamId, userId);
      }

      // Handle tournament invitation
      if (invitation.type === 'TOURNAMENT' && invitation.tournamentId) {
        // Tournament invitation logic can be added here
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      throw new Error(error.message || 'Failed to accept invitation');
    }
  }

  /**
   * Decline invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    try {
      await this.updateInvitationStatus(invitationId, 'DECLINED');
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw new Error('Failed to decline invitation');
    }
  }

  /**
   * Update invitation status
   */
  private async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
    userId?: string
  ): Promise<void> {
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (userId) {
        updateData.userId = userId;
      }

      await updateDoc(invitationRef, updateData);
    } catch (error) {
      console.error('Error updating invitation status:', error);
      throw new Error('Failed to update invitation');
    }
  }

  /**
   * Link pending invitations to user after signup
   * This is called automatically by Cloud Function, but can also be called manually
   */
  async linkPendingInvitations(userId: string, mobileNumber: string): Promise<void> {
    try {
      const q = query(
        this.invitationsCollection,
        where('mobileNumber', '==', mobileNumber),
        where('userId', '==', null),
        where('status', '==', 'PENDING')
      );

      const querySnapshot = await getDocs(q);

      const updates: Promise<void>[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const invitationRef = doc(db, 'invitations', docSnapshot.id);
        updates.push(
          updateDoc(invitationRef, {
            userId,
            updatedAt: serverTimestamp(),
          })
        );
      });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error linking pending invitations:', error);
    }
  }

  /**
   * Get invitations sent by a user
   */
  async getInvitationsSentBy(userId: string): Promise<Invitation[]> {
    try {
      const q = query(
        this.invitationsCollection,
        where('createdBy', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const invitations: Invitation[] = [];

      querySnapshot.forEach((doc) => {
        invitations.push({ ...doc.data(), id: doc.id } as Invitation);
      });

      return invitations;
    } catch (error) {
      console.error('Error fetching sent invitations:', error);
      return [];
    }
  }
}

export default new InvitationService();

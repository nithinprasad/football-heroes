import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function: Link pending invitations to user after signup
 *
 * This function automatically runs when a new user signs up with phone authentication.
 * It finds all pending invitations for that mobile number and links them to the user.
 */
export const linkInvitationsOnSignup = functions.auth.user().onCreate(async (user) => {
  const mobileNumber = user.phoneNumber;

  if (!mobileNumber) {
    console.log('No phone number found for user:', user.uid);
    return;
  }

  console.log(`Linking invitations for user ${user.uid} with mobile ${mobileNumber}`);

  try {
    // Find all pending invitations for this mobile number
    const invitationsSnapshot = await db
      .collection('invitations')
      .where('mobileNumber', '==', mobileNumber)
      .where('status', '==', 'PENDING')
      .where('userId', '==', null)
      .get();

    if (invitationsSnapshot.empty) {
      console.log('No pending invitations found for:', mobileNumber);
      return;
    }

    console.log(`Found ${invitationsSnapshot.size} pending invitations`);

    // Update all pending invitations with the user ID
    const batch = db.batch();

    invitationsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        userId: user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    console.log(`Successfully linked ${invitationsSnapshot.size} invitations to user ${user.uid}`);
  } catch (error) {
    console.error('Error linking invitations:', error);
    // Don't throw error - allow user creation to succeed even if invitation linking fails
  }
});

/**
 * Cloud Function: Check and expire old invitations
 *
 * This function runs daily to check for expired invitations and updates their status
 */
export const expireOldInvitations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Running expireOldInvitations function');

    try {
      const now = admin.firestore.Timestamp.now();

      // Find all pending invitations that have expired
      const expiredInvitations = await db
        .collection('invitations')
        .where('status', '==', 'PENDING')
        .where('expiresAt', '<=', now)
        .get();

      if (expiredInvitations.empty) {
        console.log('No expired invitations found');
        return;
      }

      console.log(`Found ${expiredInvitations.size} expired invitations`);

      // Update expired invitations
      const batch = db.batch();

      expiredInvitations.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'EXPIRED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      console.log(`Successfully expired ${expiredInvitations.size} invitations`);
    } catch (error) {
      console.error('Error expiring invitations:', error);
    }
  });

/**
 * Cloud Function: Update user statistics after match completion
 *
 * This function updates player statistics when a match is completed
 */
export const updatePlayerStatsOnMatchComplete = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if match status changed to COMPLETED
    if (beforeData.status !== 'COMPLETED' && afterData.status === 'COMPLETED') {
      console.log(`Match ${context.params.matchId} completed, updating player stats`);

      try {
        const playerStats = afterData.playerStats || [];

        if (playerStats.length === 0) {
          console.log('No player stats to update');
          return;
        }

        // Update each player's statistics
        const batch = db.batch();

        for (const stat of playerStats) {
          const userRef = db.collection('users').doc(stat.playerId);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            console.log(`User ${stat.playerId} not found`);
            continue;
          }

          const userData = userDoc.data();
          const currentStats = userData?.statistics || {
            matches: 0,
            goals: 0,
            assists: 0,
            cleanSheets: 0,
            yellowCards: 0,
            redCards: 0,
          };

          // Update statistics
          batch.update(userRef, {
            'statistics.matches': currentStats.matches + 1,
            'statistics.goals': currentStats.goals + (stat.goals || 0),
            'statistics.assists': currentStats.assists + (stat.assists || 0),
            'statistics.yellowCards': currentStats.yellowCards + (stat.yellowCards || 0),
            'statistics.redCards': currentStats.redCards + (stat.redCards || 0),
            'statistics.cleanSheets': currentStats.cleanSheets + (stat.cleanSheet ? 1 : 0),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();

        console.log(`Successfully updated stats for ${playerStats.length} players`);
      } catch (error) {
        console.error('Error updating player stats:', error);
      }
    }
  });

/**
 * Cloud Function: Send notification when user receives an invitation
 *
 * This can be extended to send push notifications via FCM
 */
export const notifyUserOnInvitation = functions.firestore
  .document('invitations/{invitationId}')
  .onCreate(async (snapshot, context) => {
    const invitation = snapshot.data();

    console.log(`New invitation created: ${context.params.invitationId}`);

    // If user exists, you could send a push notification here
    // For now, just log the event

    if (invitation.userId) {
      console.log(`Invitation for existing user: ${invitation.userId}`);
      // TODO: Send push notification via FCM
    } else {
      console.log(`Invitation for new user with mobile: ${invitation.mobileNumber}`);
      // TODO: Send SMS notification
    }
  });

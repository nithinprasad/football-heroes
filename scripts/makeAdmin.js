// Script to make a user an admin
// Run this with: node scripts/makeAdmin.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You need to download this from Firebase

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeUserAdmin(mobileNumber) {
  try {
    console.log(`Looking for user with mobile number: ${mobileNumber}`);

    // Query for user with this mobile number
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('mobileNumber', '==', mobileNumber).get();

    if (snapshot.empty) {
      console.log('No user found with that mobile number.');
      console.log('\nPlease make sure:');
      console.log('1. The user has signed up/logged in at least once');
      console.log('2. The mobile number is correct (with country code if used)');
      return;
    }

    // Update the first matching user
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`Found user: ${userData.name} (${userId})`);

    // Check if already admin
    if (userData.roles && userData.roles.includes('admin')) {
      console.log('User is already an admin!');
      return;
    }

    // Add admin role
    const currentRoles = userData.roles || ['player'];
    if (!currentRoles.includes('admin')) {
      currentRoles.push('admin');
    }

    await usersRef.doc(userId).update({
      roles: currentRoles
    });

    console.log(`✅ Successfully made ${userData.name} an admin!`);
    console.log(`Updated roles: ${currentRoles.join(', ')}`);

  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the script
const mobileNumber = process.argv[2] || '9567320219';
makeUserAdmin(mobileNumber);

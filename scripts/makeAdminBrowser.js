// Run this script directly in your browser console when logged into your app
// This will make the user with mobile number 9567320219 an admin

async function makeUserAdmin() {
  const mobileNumber = '9567320219';

  try {
    console.log('Making user admin...');

    // Import Firebase from your app
    const { db } = await import('../src/services/firebase');
    const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');

    // Find user with this mobile number
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('mobileNumber', '==', mobileNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error('❌ User not found with mobile number:', mobileNumber);
      console.log('Make sure the user has signed up at least once.');
      return;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    console.log('Found user:', userData.name);

    // Update roles to include admin
    const currentRoles = userData.roles || ['player'];
    if (!currentRoles.includes('admin')) {
      currentRoles.push('admin');

      await updateDoc(doc(db, 'users', userDoc.id), {
        roles: currentRoles
      });

      console.log('✅ Successfully made user admin!');
      console.log('New roles:', currentRoles);
      console.log('Please refresh the page for changes to take effect.');
    } else {
      console.log('✅ User is already an admin!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run it
makeUserAdmin();

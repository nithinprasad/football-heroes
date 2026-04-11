# How to Make User 9567320219 an Admin

## Method 1: Firebase Console (Easiest - No Code Required)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left sidebar
4. Click on the **users** collection
5. Find the document for the user with `mobileNumber: "9567320219"`
6. Click on that document
7. Find the `roles` field (it's an array)
8. Click the **+ Add item** button in the roles array
9. Type: `admin`
10. Click **Update**

✅ Done! The user is now an admin.

---

## Method 2: Using Browser Console (Quick)

1. Make sure you're logged into your app
2. Open browser DevTools (F12 or Right Click → Inspect)
3. Go to the **Console** tab
4. Copy and paste this code:

```javascript
// Make 9567320219 an admin
const makeAdmin = async () => {
  const { db } = await import('./services/firebase.js');
  const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('mobileNumber', '==', '9567320219'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.error('User not found');
    return;
  }
  
  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  const roles = userData.roles || ['player'];
  
  if (!roles.includes('admin')) {
    roles.push('admin');
    await updateDoc(doc(db, 'users', userDoc.id), { roles });
    console.log('✅ User is now admin!');
  } else {
    console.log('✅ Already admin!');
  }
};

makeAdmin();
```

5. Press Enter
6. Refresh the page

✅ Done!

---

## Method 3: Firebase CLI Script (Advanced)

1. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in the project root

2. Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

3. Run the script:
```bash
node scripts/makeAdmin.js 9567320219
```

✅ Done!

---

## What Admin Users Can Do

Once a user is an admin, they can:
- ✅ Access the Admin Panel at `/admin/tournaments`
- ✅ Manage all tournaments (not just ones they created)
- ✅ Edit/delete any team
- ✅ Update any match
- ✅ Access all scoring features
- ✅ Delete users (if needed)

---

## Testing

After making the user an admin:
1. Log in with mobile number `9567320219`
2. Go to Dashboard
3. You should see an **Admin Panel** option in Quick Actions
4. Click it to access admin features

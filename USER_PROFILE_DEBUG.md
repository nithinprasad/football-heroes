# User Profile Creation Debug Guide

## 🔍 How to Check if Your Profile Was Created

### Step 1: Check Browser Console

1. Open your browser's Developer Tools
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12`
   - **Safari**: Press `Cmd+Option+I`

2. Look for console messages after logging in:
   ```
   ✅ User profile created in Firestore: [your-user-id]
   ✅ Profile created successfully: { id: "...", name: "...", ... }
   ✅ User profile loaded: { ... }
   ```

### Step 2: Check Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in left sidebar
4. Look for `users` collection
5. You should see your document with your User ID

### Step 3: Check Header

After logging in, you should see:
- Your avatar (first letter of your name) in the top right
- Your name next to the avatar
- A dropdown menu when clicking the avatar

### What If User Document Wasn't Created?

**Scenario 1: Only in Firebase Authentication**
- You're in Authentication but not in Firestore `users` collection

**Solution**:
1. Open browser console
2. Log out
3. Log in again
4. Watch for console messages:
   ```
   🔧 Creating user profile for existing user: [your-uid]
   ✅ Profile created successfully
   ```

**Scenario 2: Console Shows Errors**
- Look for red error messages like:
  - `❌ Error creating user profile:`
  - `FirebaseError: Missing or insufficient permissions`

**Solution**:
1. Make sure Firestore rules are deployed
2. Check if you're using the correct Firebase project
3. Verify you have internet connection

### Common Issues and Fixes

#### Issue 1: "User not found" in Firestore
```
❌ No users collection in Firestore
✅ User exists in Authentication
```

**Fix**: The profile creation should happen automatically on login. If it doesn't:

1. Log out completely
2. Clear browser cache
3. Log in again
4. Check console for creation messages

#### Issue 2: Profile Shows as "Unverified"
```
⚠️ Yellow "Unverified" badge in header dropdown
```

**Reason**: You were added to a team by a manager before signing up.

**Is this a problem?**: No! Your profile works fine. The badge just shows you were added by someone else first.

#### Issue 3: Can't See Header/User Info
```
❌ No user info in header
❌ Only "Sign In" button shows
```

**Fix**:
1. Check if you're actually logged in
2. Open browser console
3. Type: `console.log(localStorage.getItem('user'))`
4. If it returns `null`, you need to log in again

### Debugging Code You Can Run

Open browser console and paste:

```javascript
// Check if user is logged in
console.log('Current User:', firebase.auth().currentUser);

// Check local storage
console.log('Local Storage:', localStorage);

// Force reload auth state
window.location.reload();
```

### Manual User Document Creation (Last Resort)

If automatic creation fails, you can manually create it in Firestore Console:

1. Go to Firestore Database
2. Click **+ Start collection**
3. Collection ID: `users`
4. Document ID: Your Firebase Auth UID (found in Authentication section)
5. Add fields:
   ```
   id: [your-uid] (string)
   name: "Your Name" (string)
   mobileNumber: "+1234567890" (string)
   roles: ["player"] (array)
   teamIds: [] (array)
   statistics: {
     matches: 0,
     goals: 0,
     assists: 0,
     cleanSheets: 0,
     yellowCards: 0,
     redCards: 0
   } (map)
   isVerified: true (boolean)
   createdAt: [click "timestamp"]
   updatedAt: [click "timestamp"]
   ```
6. Click **Save**
7. Refresh your app

### Expected Console Flow (Successful Login)

```
1. 🔐 Sending OTP to +1234567890...
2. ✅ OTP sent successfully

3. 🔐 Verifying OTP...
4. ✅ User profile created in Firestore: abc123xyz
5. ✅ Profile created successfully: { id: "abc123xyz", name: "User", ... }

6. 🔧 Auth state changed - user logged in
7. ✅ User profile loaded: { id: "abc123xyz", ... }

8. 🎉 Navigation complete → /dashboard
```

### Still Having Issues?

**Check these:**

1. **Firestore Rules Deployed?**
   - Run: `firebase deploy --only firestore:rules`

2. **Correct Firebase Project?**
   - Check `.firebaserc` file
   - Verify in Firebase Console

3. **Network Issues?**
   - Open Network tab in DevTools
   - Look for failed Firestore requests

4. **Browser Extensions?**
   - Try in Incognito/Private mode
   - Disable ad blockers

5. **Clear Everything and Retry**:
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

---

## 🎯 Success Checklist

After logging in, verify:

- [ ] Console shows: `✅ User profile created` or `✅ User profile loaded`
- [ ] Firestore has `users` collection with your document
- [ ] Header shows your avatar and name
- [ ] Dropdown menu works when clicking avatar
- [ ] Can navigate to Dashboard
- [ ] Can see "My Teams" option

If all checked, your profile is working correctly! 🎉

---

## 📧 Support

If none of the above works, check:
- Browser console for errors
- Firebase Console → Functions logs
- Firestore rules are correct
- Firebase project permissions

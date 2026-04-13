# How to Make a User an Admin

## Overview
Users are **NOT** admin by default. Admin access can only be granted from the backend (Firebase Firestore console). This document explains how to make a user an admin.

## Prerequisites
- Access to Firebase Console
- Firebase project for Football Heroes app
- User must already be registered in the app

## Steps to Make a User Admin

### Method 1: Using Firebase Console (Recommended)

1. **Log in to Firebase Console**
   - Go to https://console.firebase.google.com/
   - Select your Football Heroes project

2. **Navigate to Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Click on "Data" tab

3. **Find the User**
   - Click on the `users` collection
   - Find the user document you want to make admin
   - You can identify users by:
     - Document ID (user's UID)
     - `name` field
     - `mobileNumber` field

4. **Edit the User Document**
   - Click on the user document to open it
   - Find the `roles` field (it's an array)

5. **Add Admin Role**
   - Click on the `roles` array field
   - You should see existing roles like `["player"]` or `["player", "captain"]`
   - Add `"admin"` to the array
   - The final array should look like: `["player", "admin"]` or `["player", "captain", "admin"]`

6. **Save Changes**
   - Click the "Update" button to save your changes
   - The user will now have admin access

### Method 2: Using Firebase Admin SDK (For Developers)

If you have access to the backend code, you can use the Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function makeUserAdmin(userId) {
  const userRef = db.collection('users').doc(userId);
  
  await userRef.update({
    roles: admin.firestore.FieldValue.arrayUnion('admin')
  });
  
  console.log(`User ${userId} is now an admin`);
}

// Usage
makeUserAdmin('USER_UID_HERE');
```

## Verifying Admin Access

After making a user an admin, they should:

1. **Log out and log back in** to refresh their session
2. See new menu items in the navigation:
   - **Desktop**: "Contact" link in top navigation
   - **Dropdown Menu**: "📧 Contact Support" option
   - **Admin Section** in dropdown:
     - "👑 Admin Panel" (existing)
     - "📬 Admin Messages" (new)
   - **Mobile Menu**: Admin options appear after profile section

3. Be able to access:
   - `/admin/tournaments` - Admin Tournaments page
   - `/admin/messages` - Admin Messages page (view and reply to support messages)

## Admin Capabilities

Once a user is an admin, they can:

### Support Messages
- View all user support messages
- Filter messages by status (OPEN, REPLIED, CLOSED)
- Reply to user messages
- Update message status
- See message statistics (total, open, replied, closed)

### Tournament Management
- Access existing admin tournament features
- Manage tournaments, matches, etc.

## User Roles Explained

The `roles` field is an array that can contain:
- `"player"` - Regular player (default for all users)
- `"captain"` - Team captain
- `"admin"` - System administrator

A user can have multiple roles simultaneously, e.g., `["player", "captain", "admin"]`.

## Security Notes

⚠️ **Important Security Considerations:**

1. **No Self-Service Admin**: Users cannot make themselves admin through the app
2. **Backend Only**: Admin role can only be granted via Firebase Console or Admin SDK
3. **Audit Trail**: All Firestore changes are logged in Firebase
4. **Review Regularly**: Periodically review who has admin access
5. **Principle of Least Privilege**: Only grant admin access to trusted users who need it

## Troubleshooting

### User doesn't see admin features after being made admin

1. **User needs to log out and log back in**
   - The app caches user profile on login
   - Fresh login will load updated roles

2. **Check the roles array format**
   - Must be an array: `["player", "admin"]`
   - NOT a string: `"admin"`
   - Case-sensitive: use lowercase `"admin"`

3. **Verify in Firebase Console**
   - Double-check the `roles` field was saved correctly
   - Ensure you edited the correct user document

### Admin routes show "Access Denied"

1. **Clear browser cache and cookies**
2. **Log out completely and log back in**
3. **Check browser console for errors**
4. **Verify the user's UID matches the document ID**

## Contact

If you need help making a user an admin or have questions about user roles, contact the development team.

---

**Last Updated**: April 13, 2026
**Version**: 1.0

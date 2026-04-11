# Unverified Users System

## Problem Statement

When team managers add players by phone number (who haven't signed up yet), the system creates an "unverified user" with ID format: `unverified_+1234567890`. When that player later signs up via Firebase phone authentication, Firebase creates a new user with a different UUID (e.g., `abc123xyz`).

**Issue:** Teams still reference the old unverified ID, so the newly authenticated user can't see their teams.

## Solution

When a user logs in with phone authentication, the system automatically:
1. Detects if an unverified user exists with that phone number
2. Merges the unverified user data (teams, statistics) into the authenticated user
3. **Updates all database references** from the old ID to the new Firebase UID
4. User can now see teams they were added to before signing up

---

## How It Works

### Creating Unverified Users

**When:** Team manager adds a player who hasn't signed up yet

**Code:** `user.service.ts` → `createUnverifiedUser()`

```typescript
// Creates user with ID: unverified_+1234567890
const userId = `unverified_${mobileNumber.replace(/\+/g, '')}`;

await setDoc(userRef, {
  id: userId,
  name: name || `User ${mobileNumber}`,
  mobileNumber,
  roles: ['player'],
  teamIds: [],
  isVerified: false,
  // ... statistics
});
```

**Where used:**
- `ManageTeamsModal.tsx` - When organizer adds team/player
- `ManageTeam.tsx` - When captain adds player to team

---

### Merging on Authentication

**When:** User signs in with phone number for the first time

**Code:** `AuthContext.tsx` → `verifyUser()` is called automatically

**Flow:**

1. **User logs in** → Firebase Auth creates user with UID `abc123xyz`

2. **Check for unverified profile:**
   ```typescript
   if (user.phoneNumber) {
     await userService.verifyUser(user.phoneNumber, user.uid);
   }
   ```

3. **Find unverified user:**
   ```typescript
   const unverifiedUserId = `unverified_+1234567890`;
   const unverifiedUser = await getUserById(unverifiedUserId);
   ```

4. **Merge data:**
   ```typescript
   await updateUser(authenticatedUserId, {
     teamIds: [...authUser.teamIds, ...unverifiedUser.teamIds],
     statistics: {
       matches: authUser.matches + unverifiedUser.matches,
       goals: authUser.goals + unverifiedUser.goals,
       // ... merge all stats
     },
     isVerified: true,
   });
   ```

5. **Update all references** (The key fix!):
   ```typescript
   await updateUserReferences(unverifiedUserId, authenticatedUserId);
   ```

---

## What Gets Updated

### updateUserReferences() Implementation

**Scans all collections and updates references:**

#### 1. Teams Collection
```typescript
teams.where(playerIds.includes(oldUserId))
  → Update: playerIds array
  → Update: managerId (if matches)
  → Update: captainId (if matches)
```

**Example:**
```javascript
// Before
{
  teamId: "team123",
  playerIds: ["user1", "unverified_1234567890", "user3"],
  managerId: "unverified_1234567890",
  captainId: "user1"
}

// After verification
{
  teamId: "team123",
  playerIds: ["user1", "abc123xyz", "user3"],  // ✅ Updated
  managerId: "abc123xyz",                       // ✅ Updated
  captainId: "user1"
}
```

#### 2. Matches Collection
```typescript
matches.where(playerStats[].playerId == oldUserId)
  → Update: playerStats[].playerId
```

**Example:**
```javascript
// Before
{
  matchId: "match456",
  playerStats: [
    { playerId: "unverified_1234567890", goals: 2, assists: 1 },
    { playerId: "user2", goals: 1, assists: 0 }
  ]
}

// After verification
{
  matchId: "match456",
  playerStats: [
    { playerId: "abc123xyz", goals: 2, assists: 1 },  // ✅ Updated
    { playerId: "user2", goals: 1, assists: 0 }
  ]
}
```

---

## Code Locations

### Core Implementation

**File:** `src/services/user.service.ts`

```typescript
// Creates unverified user
createUnverifiedUser(mobileNumber: string, name?: string): Promise<string>

// Merges and updates references (called on login)
verifyUser(mobileNumber: string, authenticatedUserId: string): Promise<void>

// Updates all team and match references
private updateUserReferences(oldUserId: string, newUserId: string): Promise<void>
```

### Where It's Called

**File:** `src/contexts/AuthContext.tsx`

```typescript
// Automatically called when user logs in
if (user.phoneNumber) {
  await userService.verifyUser(user.phoneNumber, user.uid);
}
```

---

## User Journey Example

### Scenario: Team Manager Adds Player

1. **Manager creates team** and wants to add player
2. **Player hasn't signed up** yet, only has phone: `+1234567890`
3. **System creates unverified user:**
   - ID: `unverified_1234567890`
   - Adds to team playerIds: `["manager_id", "unverified_1234567890"]`

4. **Player receives invitation** (SMS/WhatsApp)
5. **Player opens app** and signs in with phone `+1234567890`
6. **Firebase Auth creates user:**
   - UID: `abc123xyz`
   - Phone: `+1234567890`

7. **System automatically merges:**
   - Finds unverified user by phone
   - Copies teamIds to authenticated user
   - **Updates team reference:** `unverified_1234567890` → `abc123xyz`
   - Player can now see their team!

---

## Logging

The system logs each step for debugging:

```javascript
🔄 Merging unverified user unverified_1234567890 into abc123xyz
🔄 Updating references from unverified_1234567890 to abc123xyz
✅ Updated team team123
✅ Updated match match456
✅ Updated 2 teams and 1 matches
✅ Successfully merged and updated all references
```

Check browser console after logging in to verify the merge happened.

---

## Testing

### Test Case 1: Unverified Player Logs In

1. **Setup:**
   ```bash
   # Manager adds player with phone +1234567890
   # System creates: unverified_1234567890
   ```

2. **Player logs in:**
   ```bash
   # Enter phone: +1234567890
   # Enter OTP code
   # Firebase creates user: abc123xyz
   ```

3. **Verify:**
   - Check browser console for merge logs
   - User should see their teams
   - Team roster should show correct user ID
   - User statistics should be combined

### Test Case 2: Existing User (No Merge)

1. **User already verified** logs in again
2. **System checks** for unverified user
3. **No unverified profile found** → skip merge
4. **User sees their existing data**

---

## Database Schema

### Users Collection

```typescript
{
  id: "abc123xyz",                    // Firebase Auth UID
  name: "John Doe",
  mobileNumber: "+1234567890",
  roles: ["player"],
  teamIds: ["team123", "team456"],    // Merged from unverified
  statistics: {
    matches: 10,                       // Combined stats
    goals: 8,
    assists: 5,
    // ...
  },
  isVerified: true,                    // ✅ Verified after merge
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Unverified User (Before Merge)

```typescript
{
  id: "unverified_1234567890",
  name: "User +1234567890",
  mobileNumber: "+1234567890",
  roles: ["player"],
  teamIds: ["team123"],
  statistics: { matches: 0, goals: 0, ... },
  isVerified: false,                   // ❌ Not verified
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note:** Unverified profile remains in database after merge for audit purposes, but all active references point to the verified user.

---

## Performance Considerations

**updateUserReferences() scans entire collections:**
- All teams: ~10-1000s of documents
- All matches: ~10-10000s of documents

**Optimization for large datasets:**

```typescript
// Option 1: Index-based queries (if Firestore supports)
const teamsQuery = query(
  collection(db, 'teams'),
  where('playerIds', 'array-contains', oldUserId)
);

// Option 2: Cloud Function (batch processing)
// Option 3: Background job (scheduled)
```

For small to medium apps (<10k teams), current implementation works fine.

---

## Edge Cases Handled

### 1. User Logs In Before Being Added
- No unverified user exists
- Skip merge, create fresh profile

### 2. User Added to Multiple Teams
- Unverified user has multiple teamIds
- All teams get updated with new UID
- User sees all teams after login

### 3. User Already Verified
- verifyUser finds no unverified profile
- Returns early, no updates needed

### 4. Multiple Managers Add Same Phone
- createUnverifiedUser checks if exists
- Returns existing unverified user ID
- Prevents duplicate unverified profiles

---

## Future Enhancements

### 1. Batch Updates
Use Firebase batch writes for better performance:
```typescript
const batch = writeBatch(db);
// Add all updates to batch
await batch.commit();
```

### 2. Background Processing
Move reference updates to Cloud Function:
```typescript
exports.mergeUserReferences = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    // Async merge in background
  });
```

### 3. Webhooks/Notifications
Notify team managers when player verifies:
```typescript
await sendNotification(managerId, `${playerName} has joined!`);
```

---

## Troubleshooting

### User Can't See Teams After Login

**Check:**
1. Browser console for merge logs
2. Verify unverified user ID format: `unverified_+phoneNumber` (no special chars)
3. Check team playerIds array in Firestore
4. Verify phone number format matches (with/without +)

**Debug:**
```javascript
// In browser console
const userId = firebase.auth().currentUser.uid;
const profile = await userService.getUserById(userId);
console.log('User teams:', profile.teamIds);

// Check unverified user
const unverifiedId = `unverified_1234567890`;
const unverified = await userService.getUserById(unverifiedId);
console.log('Unverified user:', unverified);
```

### Teams Show Old Unverified ID

**Cause:** updateUserReferences() failed or didn't run

**Fix:**
1. Re-login to trigger merge again
2. Check Firestore rules allow team updates
3. Manually update team document

### Statistics Not Combined

**Cause:** Merge happened but stats didn't sum correctly

**Fix:**
1. Check user.statistics structure matches
2. Verify both users have statistics object
3. Re-run verifyUser() function

---

## Summary

✅ **Unverified users** allow adding players before they sign up  
✅ **Automatic merge** on first login links accounts  
✅ **Reference updates** ensure data integrity  
✅ **No data loss** - all teams, stats, and matches preserved  
✅ **Seamless UX** - user sees teams immediately after login  

**The system now fully handles the unverified → verified user flow!** 🎉

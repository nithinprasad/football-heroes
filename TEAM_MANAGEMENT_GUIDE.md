# Tournament Team Management Guide

## 📋 Overview

This guide explains how to manage teams in tournaments, including join requests, adding teams directly, and creating unverified user profiles.

---

## 👥 For Tournament Organizers

### Accessing Team Management

1. Navigate to your tournament page
2. Look for the **"Organizer Access"** section
3. Click **"👥 Manage Teams"** button
4. You'll see a red badge with the number of pending join requests

### Managing Join Requests

**View Requests Tab:**
- See all pending join requests
- Each request shows:
  - Team name
  - Requestor name
  - Optional message from the team
  - Request timestamp

**Actions:**
- ✅ **Approve**: Adds team to tournament immediately
- ✕ **Reject**: Declines the request
- See history of reviewed requests (approved/rejected)

### Adding Teams Directly

**Add Team Tab:**

#### Option 1: Add Existing Team
1. Enter team name or Team ID in search box
2. Click **"Search"**
3. Select team from results
4. Enter manager's phone number (required)
5. Optionally enter manager's name
6. Click **"Add [Team Name] to Tournament"**

#### Option 2: Create New Team
1. Enter a team name in search box
2. If no team exists, you'll see "Create as new team?"
3. Enter manager's phone number (required)
4. Optionally enter manager's name
5. Click **"Create & Add [Team Name]"**

### Manager Phone Number

- Can be any valid phone number (e.g., +1234567890)
- If the person hasn't signed up yet:
  - System creates an **unverified profile**
  - They become the team manager
  - They can add players by phone number
  - When they sign up later, profile becomes verified

---

## 🎯 For Teams (Join Tournaments)

### How to Join a Tournament

1. **Get the Invite Code**
   - Organizer shares tournament link
   - Find invite code on tournament page (6-digit code)

2. **Submit Join Request**
   - Click **"🎯 Join Tournament"** button
   - Enter the 6-digit invite code
   - Select your team (you must be manager or captain)
   - Add optional message to organizer
   - Click **"Submit Request"**

3. **Wait for Approval**
   - Organizer will review your request
   - You'll see your team added once approved

### Requirements

- ✅ Must be logged in
- ✅ Must be manager OR captain of a team
- ✅ Need valid invite code
- ✅ Can only submit one request per team per tournament

---

## 🔓 Unverified Profiles System

### What Are Unverified Profiles?

Unverified profiles allow managers to add players and assign roles **before those people sign up**.

### Creating Unverified Profiles

**Organizers can create:**
1. Team managers by phone number
2. Teams with unverified managers

**Team Managers can:**
1. Add players to team by phone number
2. Assign roles without signup requirement

### Profile Features

**Unverified Profile:**
- ✅ Can be in teams
- ✅ Can have statistics tracked
- ✅ Shows in team rosters
- ✅ Can score goals/assists
- ❌ Cannot login
- ❌ Cannot manage teams directly

### Profile Verification

When a user with an unverified profile signs up:

1. **System Detects Match**
   - Checks phone number against unverified profiles
   - Finds matching unverified profile

2. **Auto-Merge**
   - All teams → transferred to verified account
   - All statistics → merged with verified account
   - Profile marked as `isVerified: true`

3. **User Gets Everything**
   - Access to all teams they were added to
   - All match statistics
   - Full app functionality

### Example Flow

```
1. Organizer creates tournament
2. Organizer adds "Team Warriors" with manager +1234567890
3. System creates unverified profile for +1234567890
4. Manager +1234567890 adds players to team (also by phone)
5. Team plays matches, statistics tracked
6. Later, person with +1234567890 signs up
7. System automatically:
   - Verifies profile
   - Gives access to Team Warriors
   - Shows all match statistics
   - User can now manage the team
```

---

## 🎨 User Interface

### Tournament Page

**For Non-Organizers:**
- See tournament details
- View invite code
- **"🎯 Join Tournament"** button (if logged in)
- **"📋 Share Tournament"** button

**For Organizers:**
- All of the above, plus:
- **"Organizer Access"** section
- **"📅 Generate Fixtures"** button
- **"👥 Manage Teams"** button (with pending count badge)
- **"⚙️ Settings"** button

### Modals

**Join Tournament Modal:**
- Tournament name display
- Invite code input field
- Team selection dropdown
- Optional message textarea
- Submit/Cancel buttons

**Manage Teams Modal:**
- Two tabs: "Join Requests" and "Add Team"
- Approve/Reject buttons for requests
- Search and create team interface
- Manager phone/name inputs
- Real-time pending request count

---

## 💡 Tips & Best Practices

### For Organizers

1. **Share Invite Code Widely**
   - Post in groups/chats
   - Include in tournament posters
   - Send directly to team captains

2. **Review Requests Promptly**
   - Check pending count badge
   - Read team messages
   - Approve legitimate requests quickly

3. **Add Teams Directly When Needed**
   - For last-minute entries
   - For invited teams
   - For teams without active captains

4. **Use Phone Numbers Carefully**
   - Double-check phone numbers
   - Include country code
   - Inform managers they'll get access when they sign up

### For Team Managers/Captains

1. **Get Invite Code First**
   - Ask organizer for code
   - Check tournament page

2. **Write Meaningful Messages**
   - Helps organizer recognize your team
   - Increases approval chances

3. **One Request Per Team**
   - Can't spam multiple requests
   - Wait for approval

4. **Add Players by Phone**
   - They don't need to sign up first
   - They'll get verified when they do
   - Track their stats immediately

---

## 🔧 Technical Details

### Data Flow

```
Tournament
  ├─ inviteCode (6 chars)
  ├─ teamIds[] (approved teams)
  └─ organizerIds[] (who can manage)

TournamentJoinRequest
  ├─ tournamentId
  ├─ teamId
  ├─ requestedBy (userId)
  ├─ status (PENDING/APPROVED/REJECTED)
  └─ message (optional)

User
  ├─ isVerified (true/false)
  ├─ mobileNumber
  ├─ teamIds[]
  └─ statistics
```

### Security Rules

- ✅ Anyone can read tournaments (public)
- ✅ Authenticated users can create join requests
- ✅ Only organizers can approve/reject requests
- ✅ Only organizers can add teams to tournaments
- ✅ Unverified users can exist in database
- ✅ Profile merge happens automatically on signup

---

## ❓ FAQ

**Q: Can anyone join a tournament?**
A: No, you must be a team manager or captain, have the invite code, and get organizer approval.

**Q: What if I add a wrong phone number?**
A: You can remove the team or player and add the correct one. The unverified profile will remain but unused.

**Q: Can unverified users see their profile?**
A: No, they can't log in. They'll see everything once they sign up.

**Q: What happens if someone never signs up?**
A: Their unverified profile stays in the system, showing in rosters and stats, but they can't access the app.

**Q: Can I approve multiple join requests at once?**
A: Not yet, but you can click approve quickly on each one.

**Q: Do teams need to exist before requesting to join?**
A: Yes, the team must be created first. Captains/managers can create teams from the "Create Team" page.

---

## 🚀 Future Enhancements

- Bulk approve/reject join requests
- Email/SMS notifications for approvals
- Team profile pictures in join requests
- Tournament capacity limits
- Waiting list for full tournaments
- Direct invite links (skip join request)

---

**Need Help?** Contact the tournament organizer or check the main app documentation.

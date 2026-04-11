# Tournament Organizer Guide

## 🎯 Understanding Your Role

When you **create a tournament**, you automatically become the **organizer**. As an organizer, you have special powers to manage the tournament.

---

## 🔓 What You Should See

### As Tournament Organizer:

1. **On Tournament Page, you'll see**:
   - ✅ Purple **"⚙️ Organizer Access"** section
   - ✅ **"👥 Manage Teams"** button (with pending request count badge)
   - ✅ **"📅 Generate Fixtures"** button
   - ✅ **"⚙️ Settings"** button
   - ✅ Tournament **invite code** displayed
   - ✅ **"📋 Share Tournament"** button
   - ❌ **NO "Join Tournament" button** (you don't need it - you manage teams directly!)

2. **In the Header dropdown menu**:
   - Your name and phone number
   - Dashboard, My Teams, Profile Settings links
   - 👑 **Admin Panel** (if you're an admin)

### As Regular User (Not Organizer):

1. **On Tournament Page, you'll see**:
   - ✅ Tournament details
   - ✅ Tournament invite code
   - ✅ **"🎯 Join Tournament"** button (to request to join with your team)
   - ❌ **NO Organizer Access section**

---

## 👥 How To Add Teams (As Organizer)

You have **TWO ways** to add teams:

### Method 1: Add Teams Directly (Recommended)

1. Click **"👥 Manage Teams"** button in Organizer Access section
2. Click **"Add Team"** tab
3. **Option A - Add Existing Team**:
   - Start typing team name or Team ID
   - Search happens automatically (2+ characters)
   - Click on team from search results
   - Enter manager's phone number
   - Enter manager's name (optional)
   - Click **"Add [Team Name] to Tournament"**

4. **Option B - Create New Team**:
   - Type a new team name in search box
   - You'll see "Create as new team?"
   - Enter manager's phone number
   - Enter manager's name (optional)
   - Click **"Create & Add [Team Name]"**

### Method 2: Approve Join Requests

1. Teams can request to join using the **invite code**
2. Click **"👥 Manage Teams"** button
3. See red badge with number of pending requests
4. Click **"Join Requests"** tab
5. Review each request:
   - Team name
   - Requestor name
   - Optional message from team
6. Click:
   - **"✓ Approve"** to add team to tournament
   - **"✕ Reject"** to decline request

---

## 🔗 How Teams Join (For Non-Organizers)

If you're **not an organizer** but want your team to join:

1. Get the **6-digit invite code** from tournament page
2. Click **"🎯 Join Tournament"** button
3. Enter the invite code
4. Select your team (you must be manager or captain)
5. Add optional message to organizer
6. Click **"Submit Request"**
7. Wait for organizer to approve

**Requirements**:
- ✅ You must be logged in
- ✅ You must be **manager OR captain** of a team
- ✅ You need the valid **invite code**
- ✅ Your team can only submit one request per tournament

---

## 🚫 Common Confusion

### "I see 'You need to be a manager or captain' message"

**This happens if**:
- You clicked "Join Tournament" button
- But you're trying to add teams AS an organizer

**Solution**:
- As organizer, don't use "Join Tournament" button
- Use **"Manage Teams"** button instead
- You can add ANY team - you don't need to be their manager
- You can create unverified manager profiles by phone number

### "I don't see Organizer Access section"

**Possible reasons**:
1. You're not the organizer of this tournament
2. Page hasn't loaded yet - refresh
3. Your user profile isn't loaded - check browser console

**To verify you're an organizer**:
1. Open browser console (F12)
2. Look for: `isOrganizer: true` or `userIsOrganizer`
3. Check if your UID is in tournament's `organizerIds` array

---

## 📋 Step-by-Step: Add Your First Team

### Scenario: You created a tournament and want to add teams

1. **Open your tournament page**
   - Go to `/tournaments/[your-tournament-id]`
   - You should see purple "Organizer Access" section

2. **Click "Manage Teams"**
   - Look for the yellow button with "👥 Manage Teams"
   - If there are pending requests, you'll see a red badge with count

3. **Choose "Add Team" tab**
   - Click the "Add Team" tab at the top

4. **Search or create team**:
   
   **If team exists**:
   - Type "Warriors" (example)
   - Wait for search results (300ms)
   - Click on "Warriors" team
   - It gets selected (green highlight)
   
   **If team doesn't exist**:
   - Type "New Team Name"
   - See "Create as new team?" message
   - Continue to next step

5. **Enter manager phone number**:
   - Type: `+1234567890` (with country code)
   - This person will become team manager
   - They don't need to be signed up yet!

6. **Enter manager name (optional)**:
   - Type: "John Doe"
   - Helps identify the manager later

7. **Click the green button**:
   - For existing team: "Add [Team] to Tournament"
   - For new team: "Create & Add [Team]"

8. **Done!**:
   - You'll see success toast notification
   - Team is now in your tournament
   - Manager can login later and see their team

---

## 🔧 Unverified Profiles

### What are they?

When you add a team with a manager who hasn't signed up:
- System creates an **unverified profile**
- Profile has: phone number, name (if provided), team assignment
- Profile ID: `unverified_[phone-number]`

### What happens when they sign up?

1. Person signs up with same phone number
2. System automatically:
   - ✅ Finds unverified profile
   - ✅ Merges teams into verified account
   - ✅ Merges statistics
   - ✅ Marks profile as verified
3. User sees all their teams immediately
4. User can now manage teams

### Can unverified users see their profile?

- ❌ No, they can't log in yet
- ✅ Yes, they appear in team rosters
- ✅ Yes, their stats can be tracked
- ✅ Yes, they can have matches recorded

---

## 💡 Pro Tips

1. **Share the invite code** - Post it in groups so teams can request to join
2. **Add teams proactively** - If you know teams that should join, add them directly
3. **Use phone numbers carefully** - Double-check before creating unverified profiles
4. **Generate fixtures after adding all teams** - Click "Generate Fixtures" when ready
5. **Check pending requests regularly** - Look for red badge on "Manage Teams" button

---

## ❓ FAQ

**Q: Can I add a team I'm not part of?**
A: Yes! As organizer, you can add ANY team. You don't need to be their manager or captain.

**Q: What if the team already has a manager?**
A: When you add an existing team, you're just assigning/updating their manager. The team keeps all existing players.

**Q: Can teams join without my approval?**
A: No. Teams submit a "join request" that YOU must approve. You have full control.

**Q: How do I remove a team?**
A: This feature is coming soon! For now, teams are permanent once added.

**Q: Can I have multiple organizers?**
A: Yes! You can add co-organizers in tournament settings (coming soon).

**Q: Why don't I see "Join Tournament" button?**
A: Because you're the organizer! You manage teams directly using "Manage Teams" button.

---

## 🎮 Quick Reference

| I want to... | What to do |
|-------------|------------|
| Add a team directly | Manage Teams → Add Team → Search/Create |
| See who wants to join | Manage Teams → Join Requests tab |
| Approve a team | Manage Teams → Join Requests → ✓ Approve |
| Create fixtures | Organizer Access → 📅 Generate Fixtures |
| Share tournament | Click 📋 Share Tournament button |
| See invite code | Look for 🔗 Invite Code section |

---

Need more help? Check the browser console (F12) for debug messages or ask for assistance!

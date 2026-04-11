# Football Heroes - Demo Guide

## Running the Demo

### Prerequisites
```bash
# Use Node.js 20.20.0
nvm use

# Install dependencies
npm install
```

### Option 1: With Firebase (Full Functionality)

1. Create a Firebase project at https://console.firebase.google.com/
2. Copy `.env.example` to `.env` and add your Firebase credentials
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173

### Option 2: Demo Mode (Sample Data - Coming Soon)

For demonstration without Firebase setup, we've included sample data that showcases:
- 4 teams with players
- 3 tournaments in different states (Upcoming, Ongoing, Completed)
- Live matches with scores
- Complete standings

## Sample Data Overview

### Teams
1. **Thunder FC** - 6 players, Captain: Mike Smith
2. **Lightning United** - 6 players, Captain: John Doe
3. **Storm Rangers** - 6 players
4. **Hurricane City** - 6 players

### Tournament: Spring Championship 2024
- **Format:** League + Knockout
- **Status:** ONGOING
- **Teams:** 4 teams in 2 groups
- **Matches:** 5 matches (2 completed, 1 live, 2 scheduled)

#### Current Standings

**Group A**
| Pos | Team | P | W | D | L | GF | GA | GD | Pts |
|-----|------|---|---|---|---|----|----|----|----|
| 1 | Thunder FC | 2 | 2 | 0 | 0 | 4 | 1 | +3 | 6 |
| 2 | Lightning United | 1 | 0 | 0 | 1 | 1 | 3 | -2 | 0 |

**Group B**
| Pos | Team | P | W | D | L | GF | GA | GD | Pts |
|-----|------|---|---|---|---|----|----|----|----|
| 1 | Storm Rangers | 1 | 0 | 1 | 0 | 2 | 2 | 0 | 1 |
| 2 | Hurricane City | 1 | 0 | 1 | 0 | 2 | 2 | 0 | 1 |

#### Live Match
🔴 **LIVE** - Thunder FC 1-0 Storm Rangers (14:00, Field 1)

### Sample Users

**Admin User (for testing admin features):**
- Name: John Doe
- Role: Player, Admin
- Position: Forward (#10)
- Stats: 25 matches, 18 goals, 12 assists

**Captain User:**
- Name: Mike Smith
- Role: Player, Captain
- Position: Goalkeeper (#1)
- Stats: 20 matches, 12 clean sheets

## Demo Flow

### As a Guest User (No Login)

1. **Browse Tournaments** (`/tournaments`)
   - See all 3 tournaments
   - Filter by status (Upcoming/Ongoing/Completed)
   - View tournament cards with key info

2. **View Tournament Details** (`/tournaments/tournament1`)
   - See live match scores
   - View current standings
   - Check upcoming fixtures
   - No authentication required!

### As an Authenticated User

1. **Sign In**
   - Go to `/login`
   - Enter phone number: +1234567890
   - Enter OTP code (in real Firebase, you'll receive this)
   - Complete profile if first time

2. **Dashboard** (`/dashboard`)
   - View personal statistics
   - See career summary
   - Access quick links

3. **Profile Management** (`/profile`)
   - Update name
   - Change position
   - Set jersey number
   - View all stats

### As an Admin

1. **Admin Panel** (`/admin/tournaments`)
   - Create new tournaments
   - Configure format (League/Knockout/Hybrid)
   - Set team size (5/7/11-a-side)
   - Choose dates and location
   - Generate fixtures automatically

2. **Manage Tournament**
   - View all tournaments
   - Generate fixtures for new tournaments
   - Access tournament details
   - (Future: Update scores, manage teams)

## Features to Explore

### 🌐 Public Features (No Auth)

✅ **Tournament Browsing**
- Filter: All/Upcoming/Ongoing/Completed
- Responsive cards with tournament info
- Click to view details

✅ **Live Scores**
- Real-time match scores
- Live indicator (●LIVE) for ongoing matches
- Match schedule with dates and venues
- Team names and match status

✅ **Standings Tables**
- Complete statistics (P, W, D, L, GF, GA, GD, Pts)
- Group standings for multi-group tournaments
- Overall standings for league format
- Automatic ranking and sorting

### 🔐 Authenticated Features

✅ **Profile Management**
- Edit personal information
- Update position and jersey number
- View career statistics
- Secure profile data

✅ **Dashboard**
- Personal stats overview
- Quick navigation
- Role-based menu items

### ⚙️ Admin Features

✅ **Tournament Creation**
- Multiple formats supported
- Flexible configuration
- Team size selection
- Date and location settings

✅ **Fixture Generation**
- Automatic scheduling
- Round Robin algorithm
- Knockout bracket generation
- Hybrid league+knockout support

## Technical Features

### 🎨 UI/UX
- Mobile-first responsive design
- Tailwind CSS styling
- Loading states
- Error handling
- Smooth transitions

### 🔒 Security
- Protected routes
- Role-based access
- Firebase authentication
- Secure data access

### ⚡ Performance
- Fast page loads
- Optimized rendering
- PWA support
- Service worker caching

## Next Steps After Demo

1. **Set up Firebase**
   - Create project
   - Enable services
   - Add credentials

2. **Deploy Cloud Functions**
   - Install dependencies
   - Deploy to Firebase

3. **Create Admin User**
   - Sign up normally
   - Update Firestore to add admin role

4. **Create Real Teams**
   - Use admin panel
   - Invite real players

5. **Create Tournament**
   - Set up first tournament
   - Generate fixtures
   - Start playing!

## Screenshots Preview

### Home - Tournament List
```
┌─────────────────────────────────────┐
│  ⚽ Football Heroes      [Sign In]  │
├─────────────────────────────────────┤
│  Tournaments                         │
│  [ALL] [UPCOMING] [ONGOING] [...]   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Spring Championship 2024  [●ON] │ │
│ │ 📍 Central Sports Complex       │ │
│ │ 📅 Apr 1 - Apr 30              │ │
│ │ 🏆 LEAGUE + KNOCKOUT           │ │
│ │ 👥 4 teams (6-a-side)          │ │
│ │ [View Details →]               │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Summer Cup 2024      [UPCOMING] │ │
│ │ ... │ │
└─────────────────────────────────────┘
```

### Tournament Detail - Live Scores
```
┌─────────────────────────────────────┐
│  ← Back to Tournaments              │
├─────────────────────────────────────┤
│ Spring Championship 2024            │
│ [ONGOING] [LEAGUE + KNOCKOUT]       │
│ 📍 Central Sports Complex           │
│ 👥 4 teams • ⚽ 5 matches           │
├─────────────────────────────────────┤
│ [Matches] [Standings]               │
├─────────────────────────────────────┤
│ GROUP - Group A          [●LIVE]    │
│                                     │
│   Thunder FC      1 - 0   Storm ... │
│                                     │
│ 📅 Apr 12, 14:00 • 📍 Field 1      │
└─────────────────────────────────────┘
```

### Standings Table
```
┌─────────────────────────────────────┐
│ Group A                             │
├───┬──────────┬──┬──┬──┬──┬───┬────┤
│Pos│Team      │P │W │D │L │GD │Pts │
├───┼──────────┼──┼──┼──┼──┼───┼────┤
│ 1 │Thunder FC│2 │2 │0 │0 │+3 │ 6  │
│ 2 │Lightning │1 │0 │0 │1 │-2 │ 0  │
└───┴──────────┴──┴──┴──┴──┴───┴────┘
```

## Troubleshooting

### Can't start dev server
```bash
# Make sure you're using Node 20+
node --version
nvm use 20.20.0

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Firebase errors
- Check `.env` file exists
- Verify all Firebase config values
- Ensure services are enabled in Firebase Console

### Build errors
- Update to latest dependencies
- Clear build cache: `npm run build -- --force`

## Support

For questions or issues:
- Check README.md for detailed setup
- Review SETUP.md for step-by-step guide
- See FEATURES.md for complete feature list

---

**Happy Testing! ⚽🏆**

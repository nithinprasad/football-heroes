# Football Heroes - Feature Documentation

## Overview

Football Heroes is a comprehensive football tournament management platform that allows guest users to view tournaments and live scores, authenticated users to manage their profiles, and administrators to organize and manage tournaments.

## Access Levels

### 🌐 Public/Guest Access (No Authentication Required)

Guest users can freely browse and view:

#### Tournament Browsing
- **View All Tournaments** (`/tournaments`)
  - Filter by status: ALL, UPCOMING, ONGOING, COMPLETED
  - See tournament format, location, dates, and team count
  - Responsive card-based layout

#### Tournament Details (`/tournaments/:id`)
- **Live Match Scores**
  - Real-time score updates
  - Live indicator (●LIVE) for ongoing matches
  - Match schedule with date, time, and venue
  - Team names and match status

- **Standings Tables**
  - Overall standings for League format
  - Group standings for League+Knockout format
  - Comprehensive stats: Played, Won, Drawn, Lost, GF, GA, GD, Points
  - Automatic position ranking
  - Sorted by points, goal difference, goals scored

- **Tournament Information**
  - Format type (League/Knockout/League+Knockout)
  - Team size (5-a-side, 7-a-side, 11-a-side)
  - Location and dates
  - Number of participating teams
  - Current tournament status

### 🔐 Authenticated User Features

After logging in with phone OTP:

#### User Dashboard (`/dashboard`)
- Welcome message with user name
- Career statistics overview:
  - Matches played
  - Goals scored
  - Assists
  - Yellow/Red cards
  - Clean sheets
- Quick navigation to all features
- Role badges display

#### Profile Management (`/profile`)
- **Editable Information:**
  - Name
  - Position (Goalkeeper, Defender, Midfielder, Forward)
  - Jersey number
- View mobile number (read-only)
- View assigned roles
- See career statistics
- Profile photo upload (future enhancement)

### ⚙️ Admin/Organizer Features

Users with 'admin' role can access:

#### Tournament Management (`/admin/tournaments`)
- **Create New Tournaments**
  - Tournament name
  - Location
  - Format selection:
    - League (Round Robin)
    - Knockout (Single Elimination)
    - League + Knockout (Group stage → Knockout)
  - Team size selection (5, 7, or 11-a-side)
  - Start and end dates
  - Number of groups (for League+Knockout)

- **Generate Fixtures**
  - One-click automatic fixture generation
  - Algorithm-based scheduling
  - Handles different tournament formats
  - Creates balanced matchups
  - Sets match dates and venues

- **Manage Tournaments**
  - View all tournaments
  - Access tournament details
  - Update tournament status
  - Monitor team registrations

#### Match Management (via services)
- Update match scores
- Record player statistics:
  - Goals
  - Assists
  - Yellow cards
  - Red cards
  - Clean sheets (for goalkeepers)
- Change match status (Scheduled → Ongoing → Completed)

## Core Algorithms

### Fixture Generation

#### 1. Round Robin (League Format)
- Every team plays every other team once
- Matches scheduled sequentially
- No team plays multiple matches simultaneously
- Algorithm ensures fairness and complete round completion

#### 2. Knockout (Single Elimination)
- Single-elimination bracket
- Automatic bye handling for odd number of teams
- Bracket balance with powers of 2
- Progressive stages: R32 → R16 → QF → SF → Final

#### 3. Hybrid (League + Knockout)
- Group stage with round-robin within groups
- Even team distribution across groups
- Top teams from each group qualify
- Automatic progression to knockout rounds
- TBD placeholders for knockout matches

### Standings Calculation

Real-time standings calculation based on completed matches:

1. **Points System**
   - Win: 3 points (configurable)
   - Draw: 1 point (configurable)
   - Loss: 0 points (configurable)

2. **Tiebreaker Rules** (in order)
   - Total points
   - Goal difference
   - Goals scored
   - Number of wins
   - Head-to-head record
   - Alphabetical by team name

3. **Statistics Tracked**
   - Matches played
   - Wins/Draws/Losses
   - Goals for/against
   - Goal difference
   - Position in standings

## User Journey Examples

### Guest User Journey
1. Visit `/tournaments`
2. Browse tournaments (no login required)
3. Click on a tournament
4. View live scores and standings in real-time
5. Optionally sign in to access more features

### Player Journey
1. Sign in with phone number
2. Receive and verify OTP code
3. Complete player profile (name, position, jersey number)
4. View personal dashboard with statistics
5. Update profile information
6. Browse tournaments and view own team's matches

### Admin Journey
1. Sign in with admin account
2. Access admin panel from dashboard
3. Create new tournament with desired settings
4. Wait for teams to register
5. Generate fixtures automatically
6. Monitor tournament progress
7. Update match scores as games complete
8. View real-time standings updates

## Data Models

### User
- Personal information
- Position and jersey number
- Career statistics
- Roles (player, captain, admin)
- Team associations

### Team
- Team name and logo
- Captain assignment
- Player roster
- Team statistics

### Tournament
- Name, location, dates
- Format and team size
- Point system configuration
- Participating teams
- Status tracking

### Match
- Home and away teams
- Score
- Date, time, venue
- Stage and group
- Player statistics
- Status

### Invitation
- Type (Team/Tournament)
- Mobile number or user ID
- Status tracking
- Expiration handling

## Security & Privacy

### Firestore Security Rules
- Read access: Any authenticated user
- Write access: Role-based (owner, captain, admin)
- Invitation access: Creator and recipient only
- Admin operations: Admin role required

### Storage Rules
- Profile photos: User-specific write access
- Team logos: Team member write access
- Public read access for all images

### Authentication
- Phone number OTP via Firebase Auth
- No password storage
- Session management via Firebase
- Automatic token refresh

## Progressive Web App (PWA)

### Features
- Installable on mobile devices
- Offline caching for basic functionality
- App-like experience
- Add to home screen support
- Service worker for resource caching

### Manifest Configuration
- App name: "Football Heroes"
- Theme color: Green (#10b981)
- Icons: 192x192 and 512x512
- Display: Standalone
- Orientation: Portrait

## Future Enhancements

Potential features for future development:

1. **Team Management**
   - Create and manage teams
   - Invite players to teams
   - Team roster management

2. **Invitations System**
   - Send team invitations via mobile
   - Accept/decline invitations
   - Notification system

3. **Leaderboards**
   - Top scorers across all tournaments
   - Best assists providers
   - Top goalkeepers (clean sheets)
   - Most valuable players

4. **Advanced Statistics**
   - Player performance analytics
   - Team comparison tools
   - Historical data visualization
   - Match highlights

5. **Social Features**
   - Player profiles
   - Team pages
   - Match comments
   - Photo galleries

6. **Notifications**
   - Match reminders
   - Score updates
   - Invitation alerts
   - Tournament announcements

7. **Payment Integration**
   - Tournament registration fees
   - Team registration payments
   - Subscription for premium features

## Technical Details

### State Management
- React Context API for authentication
- Local component state for UI
- Firebase real-time listeners for live data

### Routing
- React Router v6
- Protected routes with auth check
- Admin routes with role verification
- Public routes without restrictions

### Performance
- Code splitting by route
- Lazy loading for heavy components
- Image optimization
- PWA caching strategy

### Responsive Design
- Mobile-first approach
- Tailwind CSS utility classes
- Flexible grid layouts
- Touch-friendly UI elements

---

**Last Updated:** 2026-04-11  
**Version:** 1.0.0

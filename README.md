# ⚽ Football Heroes

A comprehensive football tournament management web application built with React, TypeScript, and Firebase. This platform enables players, teams, and administrators to efficiently manage football tournaments, invitations, fixtures, and player statistics.

## 🌟 Features

### User Management
- **Phone Number Authentication** - Secure OTP-based login via Firebase Authentication
- **Player Profiles** - Complete profile management with stats, position, and jersey number
- **Role-based Access** - Support for Players, Captains, and Administrators
- **Profile Photos** - Upload and manage profile pictures

### Team Management
- **Create Teams** - Captains can create and manage their teams
- **Team Invitations** - Invite players via mobile number with automatic user detection
- **Roster Management** - Add/remove players, change captains
- **Team Logos** - Upload custom team logos

### Tournament System
- **Multiple Formats** - Support for League (Round Robin), Knockout, and Hybrid formats
- **Flexible Configuration** - Customize team size, dates, location, and point systems
- **Automatic Fixture Generation** - Intelligent scheduling for all tournament types
- **Group Stages** - Support for group-based tournaments with knockout phases

### Match Management
- **Score Tracking** - Record match results and player statistics
- **Player Stats** - Track goals, assists, yellow/red cards, and clean sheets
- **Match Status** - Manage match states (Scheduled, Ongoing, Completed)
- **Venue Management** - Assign venues to matches

### Statistics & Standings
- **Team Standings** - Automatic calculation with points, goal difference, and ranking
- **Player Leaderboards** - Top scorers, assist leaders, and best goalkeepers
- **Head-to-Head Records** - Compare team performance
- **Group Standings** - Separate standings for group-stage tournaments

### Invitation System
- **Smart Invitations** - Automatically detect existing users by mobile number
- **Pending Invitations** - Track invitations for users who haven't signed up yet
- **Auto-linking** - Cloud Function automatically links invitations after signup
- **Invite Codes** - Shareable invitation codes for easy joining

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe code
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Context API** - State management

### Backend & Infrastructure
- **Firebase Authentication** - Phone number OTP authentication
- **Cloud Firestore** - NoSQL database
- **Firebase Storage** - Image storage
- **Firebase Cloud Functions** - Server-side logic
- **Firebase Hosting** - Web hosting

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Firebase account (free tier works)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nithinprasad/football-heroes.git
cd football-heroes
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Follow the setup wizard

#### Enable Firebase Services

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Phone" provider
   - Configure authorized domains

2. **Firestore Database**
   - Go to Firestore Database
   - Create database in production mode
   - Choose a location

3. **Storage**
   - Go to Storage
   - Get started and accept the default rules

4. **Hosting** (Optional for deployment)
   - Go to Hosting
   - Get started

#### Get Firebase Config

1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click the web icon (</>) to create a web app
4. Copy the firebaseConfig object

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 5. Set Up Firestore Security Rules

Deploy the security rules to Firebase:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select Firestore, Functions, and Hosting
# Choose your existing Firebase project

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

Add these rules to `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /tournaments/{tournamentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /invitations/{invitationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 6. Deploy Cloud Functions

Navigate to the functions directory and deploy:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 7. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
football-heroes/
├── src/
│   ├── components/       # Reusable React components
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # Firebase service layers
│   │   ├── firebase.ts
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── team.service.ts
│   │   ├── tournament.service.ts
│   │   ├── match.service.ts
│   │   └── invitation.service.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   │   ├── fixtureGenerator.ts
│   │   └── standingsCalculator.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── functions/            # Firebase Cloud Functions
├── public/               # Static assets
├── firestore.rules       # Firestore security rules
├── firebase.json         # Firebase configuration
├── .env.example          # Environment variables template
└── README.md
```

## 📱 Usage

### For Players

1. **Sign Up**
   - Enter your mobile number
   - Verify with OTP code
   - Complete your player profile

2. **Join Teams**
   - Accept team invitations
   - View your teams and tournaments
   - Track your statistics

3. **View Matches**
   - See upcoming fixtures
   - Check match results
   - View tournament standings

### For Captains

1. **Create Teams**
   - Set up your team
   - Upload team logo
   - Invite players

2. **Manage Roster**
   - Add/remove players
   - Assign jersey numbers
   - Change team captain

3. **Register for Tournaments**
   - Browse available tournaments
   - Register your team
   - View fixtures and schedule

### For Administrators

1. **Create Tournaments**
   - Set tournament format
   - Configure rules and settings
   - Generate fixtures automatically

2. **Manage Teams**
   - Approve team registrations
   - Assign teams to groups
   - Manage tournament roster

3. **Update Results**
   - Enter match scores
   - Record player statistics
   - Update standings

## 🔐 Security

- Phone number authentication with OTP
- Firestore security rules enforce data access
- User data is protected by authentication
- Role-based access control for sensitive operations

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase deploy
```

Your app will be available at: `https://your-project-id.web.app`

## 🧪 Testing

```bash
# Run tests (if implemented)
npm test

# Build and preview production build
npm run preview
```

## 📝 Key Algorithms

### Fixture Generation

- **Round Robin**: Ensures every team plays every other team exactly once
- **Knockout**: Creates elimination brackets with support for byes
- **Hybrid**: Combines group stage with knockout phases

### Standings Calculation

Standings are calculated based on:
1. Points (Win = 3, Draw = 1, Loss = 0)
2. Goal difference
3. Goals scored
4. Number of wins
5. Head-to-head record (if tied)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- React Team for the amazing framework
- Firebase for the backend infrastructure
- Tailwind CSS for the styling system
- All contributors and users of Football Heroes

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the maintainers

---

**Built with ⚽ by the Football Heroes team**

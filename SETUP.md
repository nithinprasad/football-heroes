# Football Heroes - Setup Guide

## Quick Start

This guide will help you get the Football Heroes application running locally.

### Prerequisites

- Node.js 20.20.0 or higher (use nvm: `nvm use`)
- npm 10.8.0 or higher
- Firebase account (free tier)

### Installation Steps

1. **Install Dependencies**
   ```bash
   nvm use  # Use Node 20.20.0
   npm install
   ```

2. **Configure Firebase**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

   Then update `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Phone provider)
   - **Firestore Database**
   - **Storage**
   - **Functions** (optional, for Cloud Functions)

4. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the config values

### Deploy Firestore Rules

```bash
firebase login
firebase init  # Select Firestore, Functions, and Hosting
firebase deploy --only firestore:rules
```

### Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase deploy
```

## Features Implemented

### ✅ Public Access (No Auth Required)
- View all tournaments
- View tournament details
- See live match scores
- View standings and statistics

### ✅ Authenticated Users
- Complete player profile
- Update personal information
- View personal statistics
- Dashboard access

### ✅ Admin/Organizer Features
- Create tournaments
- Manage tournament settings
- Generate fixtures automatically
- Update match scores
- Manage teams

## Project Structure

```
football-heroes/
├── src/
│   ├── components/       # Reusable components
│   ├── contexts/         # React contexts (Auth)
│   ├── pages/           # Page components
│   │   ├── Login.tsx           # Phone OTP login
│   │   ├── Dashboard.tsx       # User dashboard
│   │   ├── Tournaments.tsx     # Public tournament list
│   │   ├── TournamentDetail.tsx # Public tournament view
│   │   ├── Profile.tsx         # User profile (auth)
│   │   └── AdminTournaments.tsx # Admin panel
│   ├── services/        # Firebase services
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── team.service.ts
│   │   ├── tournament.service.ts
│   │   ├── match.service.ts
│   │   └── invitation.service.ts
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   │   ├── fixtureGenerator.ts
│   │   └── standingsCalculator.ts
│   └── App.tsx         # Main app with routing
├── functions/          # Firebase Cloud Functions
├── public/            # Static assets
│   ├── manifest.json  # PWA manifest
│   └── sw.js         # Service worker
└── firestore.rules   # Security rules
```

## Access Control

### Routes

**Public Routes** (No auth required):
- `/tournaments` - Browse all tournaments
- `/tournaments/:id` - View tournament details, live scores, standings

**Private Routes** (Auth required):
- `/dashboard` - User dashboard
- `/profile` - Update profile

**Admin Routes** (Admin role required):
- `/admin/tournaments` - Manage tournaments

## Troubleshooting

### Build Errors

If you see "Unexpected token '||='" errors, ensure you're using Node.js 20+:
```bash
node --version  # Should show v20.20.0
nvm use 20.20.0
```

### Firebase Connection Issues

1. Check that `.env` file exists and has correct values
2. Verify Firebase project is active
3. Ensure Authentication and Firestore are enabled

### Phone Authentication Not Working

1. Add your domain to Firebase authorized domains
2. For testing, use reCAPTCHA in test mode
3. Check that Phone provider is enabled in Firebase Auth

## Default Admin Setup

To make a user an admin, manually update their document in Firestore:

1. Go to Firebase Console → Firestore Database
2. Find the user in the `users` collection
3. Edit the `roles` field to include `"admin"`
4. Example: `roles: ["player", "admin"]`

## Support

For issues or questions, please check the main [README.md](./README.md) or create an issue on GitHub.

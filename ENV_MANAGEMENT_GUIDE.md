# Environment Variables Management Guide

## Overview
This project uses environment variables to store sensitive configuration like Firebase credentials and API keys. Proper management ensures security and easy deployment.

## File Structure

### `.env` (NEVER commit this)
Contains actual credentials for your local development environment.
```bash
VITE_FIREBASE_API_KEY=AIzaSyC...actual_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX

# Optional
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD...actual_maps_key
```

### `.env.example` (Commit this)
Template file showing what variables are needed, without actual values.
```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
# ... etc
```

### `.gitignore`
Already configured to exclude `.env` files:
```
.env
.env.local
.env.*.local
```

## Setup Instructions

### First Time Setup
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase credentials from [Firebase Console](https://console.firebase.google.com):
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click the web app or create one
   - Copy the config values

3. Fill in your `.env` file with actual values

### Team Members Setup
When a new team member joins:
1. They clone the repository
2. Run `cp .env.example .env`
3. Ask team admin for credentials or create their own Firebase project
4. Never share credentials via git, email, or Slack

## Environment-Specific Files

### Development
- **File**: `.env.development` or `.env.local`
- **Use**: Local development with dev Firebase project
- **Commit**: NO

### Production
- **File**: `.env.production`
- **Use**: Production deployment
- **Commit**: NO
- **Deploy**: Set in hosting provider (Vercel, Netlify, etc.)

### Staging
- **File**: `.env.staging`
- **Use**: Testing before production
- **Commit**: NO

## Deployment Configuration

### Vercel
1. Go to Project Settings > Environment Variables
2. Add each variable with its value
3. Select environment (Production/Preview/Development)

### Netlify
1. Site Settings > Build & Deploy > Environment
2. Add variables one by one

### Firebase Hosting
1. Use Firebase Functions config or build-time injection
2. Set in CI/CD pipeline (GitHub Actions)

## Security Best Practices

### ✅ DO:
- Keep `.env` in `.gitignore`
- Use `.env.example` as template
- Rotate keys if accidentally committed
- Use different Firebase projects for dev/prod
- Restrict API keys in Firebase/Google Cloud Console
- Use domain restrictions for web API keys

### ❌ DON'T:
- Commit `.env` to version control
- Share credentials in chat/email
- Use production keys in development
- Push `.env` to public repositories
- Hardcode credentials in source code

## Checking for Exposed Secrets

### Before Committing
```bash
# Check what's staged
git status

# Review changes
git diff --staged

# Check for .env files
git ls-files | grep '\.env$'
```

### If You Accidentally Committed Secrets
```bash
# 1. Remove from latest commit
git rm --cached .env
git commit --amend -m "Remove .env file"

# 2. If already pushed, ROTATE ALL KEYS immediately
# - Go to Firebase Console and regenerate keys
# - Update Google Cloud API restrictions
# - Consider project as compromised

# 3. Remove from history (advanced)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

## Firebase Project Setup

### Development Project
```bash
# Initialize Firebase
firebase login
firebase init

# Select development project
firebase use development-project-id

# Deploy rules
firebase deploy --only firestore:rules
```

### Production Project
```bash
# Switch to production
firebase use production-project-id

# Deploy
firebase deploy
```

## Accessing Environment Variables

### In React/Vite
```typescript
// Access with import.meta.env
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// Type safety
declare global {
  interface ImportMetaEnv {
    VITE_FIREBASE_API_KEY: string;
    VITE_FIREBASE_AUTH_DOMAIN: string;
    // ... etc
  }
}
```

### In Firebase Functions
```javascript
// Use Firebase Config
const functions = require('firebase-functions');
const apiKey = functions.config().someservice.key;
```

## Troubleshooting

### Variables Not Loading
1. Restart dev server after changing `.env`
2. Check variable names start with `VITE_`
3. Verify no spaces around `=` in `.env`
4. Check file is in project root

### "No Firebase App" Error
- Verify all Firebase env variables are set
- Check for typos in variable names
- Ensure `.env` file is being read

### API Key Restrictions
- Add your domain in Firebase Console
- For localhost: Allow `http://localhost:*`
- For production: Add your domain

## Checklist for New Features

- [ ] Added new variables to `.env.example`
- [ ] Updated this guide if needed
- [ ] Verified `.env` not in git
- [ ] Configured in deployment platform
- [ ] Tested with environment variables
- [ ] API keys have proper restrictions

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [Git Secrets Prevention](https://git-secret.io/)

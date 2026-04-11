# Setup Instructions for Other Machine

## 🚨 IMPORTANT: Follow These Steps Exactly

If you don't see features (Google login, country codes, start match, etc.) on another machine, follow this guide.

---

## Step 1: Clean Pull from GitHub

```bash
# Navigate to project directory
cd /path/to/football-heroes

# Check you're in the right repo
git remote -v
# Should show: github.com/nithinprasad/football-heroes

# Stash any local changes
git stash

# Pull latest from main
git fetch origin
git reset --hard origin/main
git pull origin main

# Verify latest commit
git log --oneline -1
# Should show: a2417a6 or later
```

---

## Step 2: Clean Install Dependencies

```bash
# Remove old node_modules and lock file
rm -rf node_modules
rm -rf package-lock.json
rm -rf node_modules/.vite
rm -rf dist

# Fresh install
npm install

# Verify installation
npm list react react-dom firebase
```

---

## Step 3: Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env  # or use your preferred editor

# Required variables:
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_key_here
```

---

## Step 4: Verify Files Exist

Run this verification script:

```bash
# Check key files exist
echo "Checking files..."
test -f src/pages/Home.tsx && echo "✅ Home.tsx" || echo "❌ Home.tsx MISSING"
test -f src/pages/Login.tsx && echo "✅ Login.tsx" || echo "❌ Login.tsx MISSING"  
test -f src/pages/Profile.tsx && echo "✅ Profile.tsx" || echo "❌ Profile.tsx MISSING"
test -f src/pages/LiveMatch.tsx && echo "✅ LiveMatch.tsx" || echo "❌ LiveMatch.tsx MISSING"
test -f src/pages/LiveScoring.tsx && echo "✅ LiveScoring.tsx" || echo "❌ LiveScoring.tsx MISSING"
test -f src/utils/countryCodes.ts && echo "✅ countryCodes.ts" || echo "❌ countryCodes.ts MISSING"

# Verify features in code
echo ""
echo "Checking features..."
grep -q "signInWithGoogle" src/pages/Login.tsx && echo "✅ Google Login" || echo "❌ Google Login MISSING"
grep -q "countryCodes.map" src/pages/Login.tsx && echo "✅ Country Codes" || echo "❌ Country Codes MISSING"
grep -q "create-match" src/pages/Home.tsx && echo "✅ Create Match" || echo "❌ Create Match MISSING"
grep -q "ownGoals" src/types/index.ts && echo "✅ Own Goals" || echo "❌ Own Goals MISSING"
```

---

## Step 5: Start Dev Server

```bash
# Option A: Using the restart script
chmod +x restart-dev.sh
./restart-dev.sh

# Option B: Manual start
npm run dev
```

Wait for output like:
```
VITE v6.0.7  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 6: Clear Browser Cache

**CRITICAL:** Old browser cache can show old UI!

### Chrome/Edge:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use: Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)

### Firefox:
- Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)

### Safari:
- Cmd+Option+R

### OR: Use Incognito/Private Mode
```
Chrome: Cmd+Shift+N / Ctrl+Shift+N
Firefox: Cmd+Shift+P / Ctrl+Shift+P  
Safari: Cmd+Shift+N
```

---

## Step 7: Verify Features in Browser

Open http://localhost:5173 and check:

### Home Page Should Have:
- ✅ Hero section with "Football Heroes" title
- ✅ "Create Tournament" button
- ✅ "Create Team" button
- ✅ **"Create Match" button** ← This was missing
- ✅ Upcoming tournaments section
- ✅ Leaderboards section

### Login Page Should Have:
- ✅ Country code dropdown with flags (🇺🇸, 🇮🇳, etc.)
- ✅ Phone number input
- ✅ "Send OTP" button
- ✅ "OR" divider
- ✅ **"Continue with Google" button** ← This was missing

### Profile Page Should Have:
- ✅ User photo/avatar
- ✅ Edit profile button
- ✅ Statistics cards (Matches, Goals, Assists, Cards)
- ✅ My Teams section
- ✅ Tournaments section
- ✅ Recent Matches section
- ✅ Modern gradient design with cards

---

## 🔍 Troubleshooting

### Problem: Features Still Missing

**Solution 1: Verify Git Commit**
```bash
git log --oneline -5
```
Should show recent commits with features.

**Solution 2: Check for Merge Conflicts**
```bash
git status
```
Should say "nothing to commit, working tree clean"

**Solution 3: Force Clean**
```bash
git clean -fdx
git reset --hard origin/main
npm install
```

**Solution 4: Clone Fresh**
```bash
cd ..
mv football-heroes football-heroes-old
git clone https://github.com/nithinprasad/football-heroes.git
cd football-heroes
npm install
cp ../football-heroes-old/.env .env
npm run dev
```

---

### Problem: Build Errors

**Solution: Ignore TypeScript Warnings**

The build has some TS warnings about unused variables. These don't affect dev mode:
```bash
# Dev mode works fine with warnings
npm run dev
```

To fix for production:
```bash
# Edit tsconfig.json, set:
"noUnusedLocals": false,
"noUnusedParameters": false,
```

---

### Problem: Port Already in Use

```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

---

### Problem: Firebase Errors

1. Verify .env file has correct values
2. Check Firebase console: https://console.firebase.google.com
3. Enable Authentication > Sign-in methods > Phone & Google
4. Add localhost:5173 to authorized domains

---

## 📋 Features Checklist

After setup, verify you can see/use:

### Authentication
- [ ] Login with phone number
- [ ] Country code selector (248 countries)
- [ ] Login with Google button
- [ ] OTP verification
- [ ] Profile setup wizard

### Home Page
- [ ] Create Tournament button
- [ ] Create Team button
- [ ] Create Match button ← **KEY FEATURE**
- [ ] Upcoming tournaments list
- [ ] Top scorers leaderboard
- [ ] Top assists leaderboard
- [ ] Top goalkeepers leaderboard

### Profile
- [ ] Modern card-based design
- [ ] Statistics display (matches, goals, assists)
- [ ] Edit profile functionality
- [ ] Upload photo
- [ ] My Teams section
- [ ] Tournaments section
- [ ] Recent matches

### Match Features
- [ ] Create standalone match
- [ ] Create tournament match
- [ ] Live scoring (simple mode)
- [ ] Full scoring mode with timer
- [ ] Own goals tracking
- [ ] Guest player support
- [ ] Real-time updates
- [ ] Shareable match links

---

## ✅ Success Verification

You should see:

1. **Login Page:**
   - Country dropdown: 🇺🇸 +1, 🇮🇳 +91, etc.
   - White "Continue with Google" button

2. **Home Page:**
   - Three large action cards (Tournament, Team, **Match**)
   - Modern gradient background
   - Leaderboards section

3. **Profile Page:**
   - Clean card-based layout
   - Stats in colored cards
   - Teams and tournaments sections

4. **Match Pages:**
   - LiveMatch.tsx for simple scoring
   - LiveScoring.tsx for full mode
   - Own goals support (⚽🔴)

---

## 🆘 Still Not Working?

1. **Screenshot what you see** and compare to expected UI
2. **Check browser console** (F12) for errors
3. **Run verification script** from Step 4
4. **Compare file sizes:**
   ```bash
   ls -lh src/pages/*.tsx | awk '{print $5, $9}'
   ```
   - LiveMatch.tsx should be ~52KB
   - Login.tsx should be ~10KB
   - Home.tsx should be ~35KB

5. **Check Node version:**
   ```bash
   node -v
   # Should be v14+ (recommended v18 or v20)
   ```

---

## 📞 Contact

If all else fails, share:
- Output of: `git log --oneline -5`
- Output of: `npm list react firebase`
- Screenshot of browser
- Browser console errors

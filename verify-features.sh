#!/bin/bash

echo "======================================"
echo "  Football Heroes - Feature Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check git status
echo "📋 Git Status:"
echo "---"
COMMIT=$(git log --oneline -1)
echo "Current commit: $COMMIT"
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
echo ""

# Check files exist
echo "📁 Checking Files:"
echo "---"
FILES=(
  "src/pages/Home.tsx"
  "src/pages/Login.tsx"
  "src/pages/Profile.tsx"
  "src/pages/LiveMatch.tsx"
  "src/pages/LiveScoring.tsx"
  "src/pages/CreateMatch.tsx"
  "src/utils/countryCodes.ts"
  "src/services/auth.service.ts"
  "src/types/index.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(ls -lh "$file" | awk '{print $5}')
    echo -e "${GREEN}✅${NC} $file ($SIZE)"
  else
    echo -e "${RED}❌${NC} $file (MISSING)"
  fi
done
echo ""

# Check features in code
echo "🔍 Checking Features in Code:"
echo "---"

# Google Login
if grep -q "signInWithGoogle" src/pages/Login.tsx; then
  echo -e "${GREEN}✅${NC} Google Login - PRESENT"
  grep -n "signInWithGoogle" src/pages/Login.tsx | head -1
else
  echo -e "${RED}❌${NC} Google Login - MISSING"
fi

# Country Codes
if grep -q "countryCodes.map" src/pages/Login.tsx; then
  echo -e "${GREEN}✅${NC} Country Code Selector - PRESENT"
  COUNT=$(wc -l < src/utils/countryCodes.ts)
  echo "   countryCodes.ts has $COUNT lines"
else
  echo -e "${RED}❌${NC} Country Code Selector - MISSING"
fi

# Create Match Button
if grep -q "create-match\|Create Match" src/pages/Home.tsx; then
  echo -e "${GREEN}✅${NC} Create Match Button - PRESENT"
  grep -n "create-match\|Create Match" src/pages/Home.tsx | head -1
else
  echo -e "${RED}❌${NC} Create Match Button - MISSING"
fi

# Own Goals
if grep -q "ownGoals" src/types/index.ts; then
  echo -e "${GREEN}✅${NC} Own Goals Tracking - PRESENT"
  grep -n "ownGoals" src/types/index.ts | head -1
else
  echo -e "${RED}❌${NC} Own Goals Tracking - MISSING"
fi

# Live Match Files
if [ -f "src/pages/LiveMatch.tsx" ] && [ -f "src/pages/LiveScoring.tsx" ]; then
  echo -e "${GREEN}✅${NC} Live Match Scoring - PRESENT (2 modes)"
  ls -lh src/pages/LiveMatch.tsx src/pages/LiveScoring.tsx | awk '{print "   " $9, "(" $5 ")"}'
else
  echo -e "${RED}❌${NC} Live Match Scoring - MISSING"
fi

echo ""

# Check environment
echo "🔧 Environment:"
echo "---"
if [ -f ".env" ]; then
  echo -e "${GREEN}✅${NC} .env file exists"
  echo "   Variables configured: $(grep -c "^VITE_" .env)"
else
  echo -e "${YELLOW}⚠️${NC}  .env file missing (copy from .env.example)"
fi

if [ -d "node_modules" ]; then
  echo -e "${GREEN}✅${NC} node_modules installed"
  PACKAGES=$(ls node_modules | wc -l)
  echo "   Packages: $PACKAGES"
else
  echo -e "${RED}❌${NC} node_modules missing (run: npm install)"
fi

echo ""

# Check server
echo "🌐 Dev Server:"
echo "---"
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
  echo -e "${GREEN}✅${NC} Dev server is RUNNING on port 5173"
  echo "   Access at: http://localhost:5173"
else
  echo -e "${YELLOW}⚠️${NC}  Dev server is NOT running"
  echo "   Start with: npm run dev"
fi

echo ""

# Summary
echo "======================================"
echo "  Summary"
echo "======================================"

MISSING=0

if ! grep -q "signInWithGoogle" src/pages/Login.tsx 2>/dev/null; then
  ((MISSING++))
fi

if ! grep -q "countryCodes.map" src/pages/Login.tsx 2>/dev/null; then
  ((MISSING++))
fi

if ! grep -q "create-match" src/pages/Home.tsx 2>/dev/null; then
  ((MISSING++))
fi

if ! [ -f "src/pages/LiveMatch.tsx" ]; then
  ((MISSING++))
fi

if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ ALL FEATURES PRESENT!${NC}"
  echo ""
  echo "If you don't see them in browser:"
  echo "1. Clear browser cache (Cmd+Shift+R)"
  echo "2. Open in incognito mode"
  echo "3. Check browser console for errors"
else
  echo -e "${RED}❌ $MISSING FEATURES MISSING!${NC}"
  echo ""
  echo "To fix:"
  echo "1. git fetch origin"
  echo "2. git reset --hard origin/main"
  echo "3. npm install"
  echo "4. npm run dev"
fi

echo ""
echo "📚 For detailed troubleshooting:"
echo "   cat SETUP_OTHER_MACHINE.md"
echo ""

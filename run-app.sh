#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 FOOTBALL HEROES - Starting Application"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⏳ Dependencies not installed yet. Installing now..."
    echo ""
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 20.20.0
    npm install
    echo ""
fi

echo "✅ Dependencies ready!"
echo ""
echo "🌐 Starting development server..."
echo "   Open: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Load nvm and start server
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20.20.0
npm run dev

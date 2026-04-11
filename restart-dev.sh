#!/bin/bash

echo "🛑 Stopping any running dev servers..."
pkill -f "vite" 2>/dev/null
pkill -f "node.*dev" 2>/dev/null

echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist

echo "📋 Checking Node version..."
node -v

echo "🔍 Checking if port 5173 is available..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5173 is in use. Killing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 1
else
    echo "✅ Port 5173 is available"
fi

echo "🚀 Starting dev server..."
npm run dev

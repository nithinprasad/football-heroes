# Vite WebSocket Connection Error - Troubleshooting Guide

## Error Message
```
vite failed to connect to web socket
WebSocket connection to 'ws://localhost:5173/' failed
```

## ✅ Solutions (Try in Order)

### Solution 1: Updated Vite Config (Already Applied)
The `vite.config.ts` has been updated with proper server configuration:
- Host set to listen on all interfaces
- HMR WebSocket properly configured
- Flexible port binding

### Solution 2: Clear Cache and Restart
```bash
# Stop the dev server (Ctrl+C)

# Clear Vite cache
rm -rf node_modules/.vite

# Clear browser cache or open in incognito mode

# Restart dev server
npm run dev
```

### Solution 3: Check Port Availability
```bash
# Check if port 5173 is already in use
lsof -i :5173

# If port is in use, kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3000
```

### Solution 4: Firewall/Antivirus
- **Windows**: Allow Node.js through Windows Firewall
- **Mac**: System Preferences > Security & Privacy > Firewall Options > Allow Node
- **Linux**: Check `ufw` or `iptables` rules

### Solution 5: Network/Proxy Issues
If behind a corporate proxy or VPN:

```bash
# Add to vite.config.ts server section:
server: {
  host: '0.0.0.0',
  port: 5173,
  hmr: {
    clientPort: 5173,
  },
}
```

### Solution 6: WSL/Docker Specific
If running in WSL or Docker:

```bash
# Update vite.config.ts:
server: {
  host: '0.0.0.0',
  port: 5173,
  watch: {
    usePolling: true,
  },
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 5173,
  },
}
```

### Solution 7: Use Different Browser
Sometimes browser extensions block WebSocket connections:
- Try Chrome Incognito mode
- Try Firefox
- Disable browser extensions temporarily

### Solution 8: Check Environment
```bash
# Make sure you're in the project directory
pwd

# Should show: .../football-heroes

# Check .env file exists
ls -la .env

# Restart with verbose logging
npm run dev -- --debug
```

## 🔍 Diagnostic Commands

### Check Node Version
```bash
node -v
# Should be >= 14 (recommended 18 or 20)
```

### Check npm Version
```bash
npm -v
```

### Check Network Interfaces
```bash
# Mac/Linux
ifconfig

# Windows
ipconfig
```

### Test WebSocket Connection
```bash
# Install wscat (WebSocket testing tool)
npm install -g wscat

# Test connection (after dev server is running)
wscat -c ws://localhost:5173
```

## 🚀 Quick Fix Script

Create a file `restart-dev.sh`:

```bash
#!/bin/bash
echo "🛑 Stopping any running dev servers..."
pkill -f "vite" 2>/dev/null

echo "🧹 Clearing cache..."
rm -rf node_modules/.vite
rm -rf dist

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting dev server..."
npm run dev
```

Make it executable and run:
```bash
chmod +x restart-dev.sh
./restart-dev.sh
```

## 🌐 Alternative: Use IP Address

If localhost doesn't work, try accessing via IP:

```bash
# Find your local IP
# Mac/Linux:
ipconfig getifaddr en0

# Then access:
http://YOUR_IP:5173
```

## 📝 Common Scenarios

### Scenario 1: Works on Machine A, Not on Machine B
- Check Node version matches
- Check firewall settings
- Clear npm cache: `npm cache clean --force`
- Delete and reinstall node_modules

### Scenario 2: Works Initially, Then Stops
- Port conflict with another service
- Previous Vite process still running
- System resources exhausted

### Scenario 3: EADDRINUSE Error
```bash
# Port is already in use
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Scenario 4: Behind Corporate Proxy
```bash
# Set proxy in .npmrc
proxy=http://proxy.company.com:8080
https-proxy=http://proxy.company.com:8080

# Or disable SSL verification (not recommended for production)
npm config set strict-ssl false
```

## ✅ Verification

After applying fixes, verify:

1. ✅ Dev server starts without errors
2. ✅ Browser shows the app at http://localhost:5173
3. ✅ Console shows: "connected" (not "disconnected")
4. ✅ Hot Module Replacement works (edit a file and see instant update)
5. ✅ No WebSocket errors in browser console

## 🆘 Still Not Working?

If none of the above work:

1. **Check logs**: Look in terminal for specific error messages
2. **Browser console**: Check Network tab for failed WebSocket connections
3. **System logs**: Check system event logs for port/permission errors
4. **Try different machine**: Isolate if it's machine-specific
5. **Use build mode**: `npm run build && npm run preview` (no HMR but works)

## 📧 Report Issue

If still stuck, gather this info:
- OS and version
- Node version (`node -v`)
- npm version (`npm -v`)
- Error screenshot
- Full terminal output
- Browser console errors

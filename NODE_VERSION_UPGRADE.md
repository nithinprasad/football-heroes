# Node.js Version Upgrade Required

## ⚠️ CRITICAL ISSUE

**Current Node version:** v14.18.2
**Required Node version:** v18.0.0 or higher (v20.x recommended)

### Why Upgrade?

Modern packages (Vite 6, Firebase, React Router 7) require Node 18+. Your current version doesn't support modern JavaScript syntax like `||=` operator.

---

## ✅ Solution: Upgrade Node.js

### Option 1: Using nvm (Recommended)

```bash
# Check if nvm is installed
nvm --version

# If nvm exists:
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v
# Should show: v20.x.x
```

### Option 2: Install nvm First

**Mac/Linux:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
```

**Windows:**
Download from: https://github.com/coreybutler/nvm-windows/releases

### Option 3: Direct Install

Download from: https://nodejs.org/

Choose: **LTS (Long Term Support)** - Currently v20.x

---

## After Upgrading Node

```bash
# 1. Verify version
node -v
# Should be v18+ or v20+

npm -v
# Should be v9+ or v10+

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Start dev server
npm run dev

# Should see:
# VITE v6.0.7  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

---

## 🔍 Current Error Explained

```
SyntaxError: Unexpected token '||='
```

This happens because:
- Node v14 doesn't support the `||=` (logical OR assignment) operator
- Vite 6 and modern packages use this syntax
- You need Node v18+ which supports ES2021 features

---

## ⚡ Quick Fix for This Machine

```bash
# 1. Install Node 20
nvm install 20
nvm use 20

# 2. Clean everything
cd /path/to/football-heroes
rm -rf node_modules package-lock.json
npm install

# 3. Start server
npm run dev
```

---

## 🌍 For Other Machines

Make sure ALL development machines have Node v18 or v20:

```bash
# Check on each machine
node -v

# If less than v18, upgrade using nvm or direct install
```

---

## 📦 Package Requirements

Current project requires:

| Package | Minimum Node Version |
|---------|---------------------|
| Vite 6.x | Node 18+ |
| Firebase 11.x | Node 18+ |
| React Router 7.x | Node 20+ |
| TypeScript 5.x | Node 18+ |

**Recommended:** Node v20.x LTS

---

## ✅ Verification After Upgrade

```bash
# Run verification script
./verify-features.sh

# Should show all green checkmarks and server running
```

---

## 🆘 Still Having Issues?

1. **Completely remove old Node:**
   ```bash
   # Mac/Linux
   which node
   # If shows /usr/local/bin/node, remove it
   sudo rm -rf /usr/local/bin/node
   sudo rm -rf /usr/local/lib/node_modules
   ```

2. **Install fresh with nvm:**
   ```bash
   nvm install 20
   nvm use 20
   ```

3. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

4. **Fresh project install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## 📝 Note for CI/CD

If using GitHub Actions or other CI:

```yaml
# .github/workflows/*.yml
- uses: actions/setup-node@v4
  with:
    node-version: '20'  # Use Node 20
```

---

## Summary

1. ⚠️ **Current:** Node v14.18.2 (TOO OLD)
2. ✅ **Required:** Node v18.0.0+ (v20.x recommended)
3. 🔧 **Fix:** Use nvm to install Node 20
4. 🧹 **Clean:** Remove node_modules and reinstall
5. 🚀 **Run:** npm run dev should work

**This is why the dev server won't start on this machine!**

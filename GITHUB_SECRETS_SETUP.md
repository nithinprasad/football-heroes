# GitHub Secrets Setup Guide

## ✅ Secrets Already Added

The following environment variables have been added as GitHub Secrets:

- ✅ `VITE_FIREBASE_API_KEY`
- ✅ `VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `VITE_FIREBASE_PROJECT_ID`
- ✅ `VITE_FIREBASE_STORAGE_BUCKET`
- ✅ `VITE_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `VITE_FIREBASE_APP_ID`
- ✅ `VITE_FIREBASE_MEASUREMENT_ID`
- ✅ `VITE_RECAPTCHA_SITE_KEY`

## 🔐 Additional Secrets Needed for Deployment

To enable automatic deployments via GitHub Actions, you need to add these additional secrets:

### 1. FIREBASE_TOKEN (For Firestore Rules Deployment)

```bash
# Generate Firebase CI token
firebase login:ci

# Copy the token and add it as a GitHub secret
gh secret set FIREBASE_TOKEN --body "YOUR_TOKEN_HERE" --repo nithinprasad/football-heroes
```

### 2. FIREBASE_SERVICE_ACCOUNT (For Firebase Hosting Deployment)

1. **Generate Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/football-heroes-8188b/settings/serviceaccounts/adminsdk)
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Add as GitHub Secret:**
   ```bash
   # Add the entire JSON content as a secret
   gh secret set FIREBASE_SERVICE_ACCOUNT --body "$(cat path/to/service-account-key.json)" --repo nithinprasad/football-heroes
   ```

   Or via GitHub web interface:
   - Go to https://github.com/nithinprasad/football-heroes/settings/secrets/actions
   - Click "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire JSON content
   - Click "Add secret"

## 📋 Verifying Secrets

### View All Secrets
```bash
gh secret list --repo nithinprasad/football-heroes
```

### Update a Secret
```bash
gh secret set SECRET_NAME --body "NEW_VALUE" --repo nithinprasad/football-heroes
```

### Delete a Secret
```bash
gh secret delete SECRET_NAME --repo nithinprasad/football-heroes
```

## 🚀 GitHub Actions Workflows

Two workflows have been created:

### 1. Deploy Firestore Rules
**File:** `.github/workflows/deploy-firestore-rules.yml`
- **Trigger:** Push to main (when firestore.rules changes) or manual dispatch
- **Action:** Deploys Firestore security rules and indexes
- **Required Secret:** `FIREBASE_TOKEN`

### 2. Deploy to Firebase Hosting
**File:** `.github/workflows/deploy.yml`
- **Trigger:** Push to main
- **Action:** Builds and deploys the entire app to Firebase Hosting
- **Required Secrets:** 
  - All `VITE_*` environment variables (already added ✅)
  - `FIREBASE_SERVICE_ACCOUNT`

## 🔧 Manual Deployment (Without Workflows)

If you prefer to deploy manually:

### Using Firebase Token
```bash
# Login once
firebase login:ci

# Deploy with token
npx firebase-tools@latest deploy --token "YOUR_TOKEN"
```

### Using npx (No Installation)
```bash
# Login
npx firebase-tools@latest login

# Deploy rules only
npx firebase-tools@latest deploy --only firestore:rules

# Deploy hosting only
npx firebase-tools@latest deploy --only hosting

# Deploy everything
npx firebase-tools@latest deploy
```

## 🔒 Security Best Practices

### DO:
- ✅ Store all credentials in GitHub Secrets
- ✅ Rotate secrets periodically
- ✅ Use service accounts with minimal permissions
- ✅ Review workflow logs for exposed secrets (GitHub masks them automatically)
- ✅ Use different Firebase projects for dev/staging/prod

### DON'T:
- ❌ Commit `.env` files to the repository
- ❌ Share secrets in pull request comments
- ❌ Log secret values in workflows
- ❌ Use production credentials in development
- ❌ Grant more permissions than necessary to service accounts

## 🌍 Environment-Specific Secrets

For multiple environments (dev, staging, prod):

### Option 1: Different Repositories
- `football-heroes-dev` repo with dev secrets
- `football-heroes-staging` repo with staging secrets
- `football-heroes` repo with production secrets

### Option 2: Environment Secrets
```bash
# Add environment-specific secrets
gh secret set VITE_FIREBASE_API_KEY --env production --body "PROD_KEY"
gh secret set VITE_FIREBASE_API_KEY --env staging --body "STAGING_KEY"
```

Then in your workflow:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # or staging
```

## 🆘 Troubleshooting

### Secrets Not Working in Workflow
1. Check secret name matches exactly (case-sensitive)
2. Verify secret is set at repository level (not organization)
3. Check workflow has permission to access secrets
4. Re-run workflow (sometimes first run fails)

### Firebase Token Expired
```bash
# Generate new token
firebase login:ci

# Update secret
gh secret set FIREBASE_TOKEN --body "NEW_TOKEN"
```

### Service Account Permissions Error
1. Go to Firebase Console > Project Settings > Service Accounts
2. Ensure service account has required roles:
   - Firebase Admin SDK Administrator
   - Cloud Datastore User (for Firestore)
3. Regenerate key if needed

## 📞 Getting Help

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 📝 Next Steps

1. **Add FIREBASE_TOKEN:**
   ```bash
   firebase login:ci
   gh secret set FIREBASE_TOKEN --body "YOUR_TOKEN"
   ```

2. **Test Firestore Rules Deployment:**
   - Push a change to `firestore.rules`
   - Watch the GitHub Actions workflow run
   - Verify rules are updated in Firebase Console

3. **Add FIREBASE_SERVICE_ACCOUNT (Optional):**
   - Download service account JSON
   - Add as GitHub secret
   - Enable full hosting deployment

4. **Celebrate!** 🎉
   Your secrets are secure and deployments are automated!

# reCAPTCHA Setup

## Football App reCAPTCHA Credentials

### Site Key (Public - Client-Side)
Used in the frontend for phone authentication via Firebase.

```
6Letn7IsAAAAAD_hX51SR6zYc0VvZtqzme9av6Bg
```

**Where it's used:**
- Firebase Phone Authentication (RecaptchaVerifier)
- Invisible reCAPTCHA for OTP verification
- Login page (`src/pages/Login.tsx`)

### Secret Key (Private - Server-Side)
Used for server-side verification with Google reCAPTCHA API.

```
RECAPTCHA_SECRET_KEY=6Letn7IsAAAAANUw9FNd1PjOaiC3d4j_HGK7yWFz
```

**Where it should be used:**
- Firebase Functions (if implementing custom verification)
- Backend API endpoints that need to verify reCAPTCHA responses
- Server-side validation before allowing actions

## Environment Variables

### Local Development (.env)
```env
VITE_RECAPTCHA_SITE_KEY=6Letn7IsAAAAAD_hX51SR6zYc0VvZtqzme9av6Bg
RECAPTCHA_SECRET_KEY=6Letn7IsAAAAANUw9FNd1PjOaiC3d4j_HGK7yWFz
```

### GitHub Secrets (CI/CD)
Both keys are stored as GitHub repository secrets:
- `VITE_RECAPTCHA_SITE_KEY` - Baked into client bundle at build time
- `RECAPTCHA_SECRET_KEY` - For server-side use (Firebase Functions)

## How Phone Authentication Works

1. User enters phone number on Login page
2. Frontend initializes invisible reCAPTCHA (`RecaptchaVerifier`)
3. Firebase automatically triggers reCAPTCHA verification
4. If verification passes, SMS OTP is sent to phone
5. User enters OTP code
6. Firebase verifies OTP and signs in user

## Firebase Console Setup

The reCAPTCHA site key should also be registered in:
- **Firebase Console** → Authentication → Sign-in method → Phone
- Add the domain: `football-heroes-8188b.web.app`
- Add local development domain: `localhost`

## Verification

To verify reCAPTCHA is working:

1. Open https://football-heroes-8188b.web.app/
2. Click "Login with Phone"
3. Enter phone number
4. Check browser console - should see: "reCAPTCHA solved successfully"
5. OTP should be sent to phone

## Troubleshooting

### "reCAPTCHA verification failed"
- Check that the site key matches in GitHub Secrets
- Verify domain is authorized in Firebase Console
- Clear browser cache and try again

### "reCAPTCHA expired"
- User took too long to enter phone number
- Page should automatically reset and create new verifier

### "Invalid reCAPTCHA response"
- Secret key mismatch on server-side
- Check RECAPTCHA_SECRET_KEY in Firebase Functions environment

## Documentation

- [Firebase Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth)
- [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v2 Invisible](https://developers.google.com/recaptcha/docs/invisible)

---

**Last Updated:** 2026-04-12  
**Status:** ✅ Active and configured in production

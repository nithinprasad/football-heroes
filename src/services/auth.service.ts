import {
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole } from '../types';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

class AuthService {
  /**
   * Load reCAPTCHA script dynamically
   */
  private loadRecaptchaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector('script[src*="recaptcha"]')) {
        resolve();
        return;
      }

      const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        console.warn('VITE_RECAPTCHA_SITE_KEY not found, using Firebase default');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize reCAPTCHA verifier for phone authentication
   */
  async initRecaptchaVerifier(containerId: string = 'recaptcha-container'): Promise<RecaptchaVerifier> {
    // Load reCAPTCHA script first
    await this.loadRecaptchaScript();

    // Clear existing verifier if it exists
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Could not clear existing reCAPTCHA:', e);
      }
      window.recaptchaVerifier = undefined;
    }

    // Ensure the container element exists
    let container = document.getElementById(containerId);
    if (!container) {
      console.warn(`reCAPTCHA container '${containerId}' not found, creating it`);
      container = document.createElement('div');
      container.id = containerId;
      container.style.display = 'block'; // Make sure it's visible for reCAPTCHA
      document.body.appendChild(container);
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: any) => {
          // reCAPTCHA solved - will proceed with phone authentication
          console.log('reCAPTCHA solved successfully');
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          console.error('reCAPTCHA expired');
        },
      });

      // Render the reCAPTCHA
      window.recaptchaVerifier.render().then((widgetId: any) => {
        console.log('reCAPTCHA rendered with widget ID:', widgetId);
      });
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      throw error;
    }

    return window.recaptchaVerifier;
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    try {
      // Ensure phone number is in E.164 format (+country_code + number)
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      const appVerifier = window.recaptchaVerifier || await this.initRecaptchaVerifier();
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedNumber,
        appVerifier
      );

      window.confirmationResult = confirmationResult;
      return confirmationResult;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(code: string): Promise<FirebaseUser> {
    try {
      if (!window.confirmationResult) {
        throw new Error('No confirmation result found. Please request OTP first.');
      }

      const result = await window.confirmationResult.confirm(code);
      const user = result.user;

      // Check if this is a new user
      const userDoc = await this.getUserProfile(user.uid);

      if (!userDoc) {
        // Create initial user profile
        await this.createUserProfile(user.uid, {
          mobileNumber: user.phoneNumber || '',
          name: '',
          roles: ['player'],
        });
      }

      return user;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid OTP code');
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists
      const userDoc = await this.getUserProfile(user.uid);

      if (!userDoc) {
        // Create initial user profile with Google info
        await this.createUserProfile(user.uid, {
          mobileNumber: '', // Will be added later
          name: user.displayName || '',
          roles: ['player'],
          photoURL: user.photoURL || undefined,
        });
      }

      return user;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  /**
   * Create user profile in Firestore
   */
  async createUserProfile(
    uid: string,
    data: {
      mobileNumber: string;
      name: string;
      roles: UserRole[];
      photoURL?: string;
    }
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userData: Partial<User> = {
        id: uid,
        mobileNumber: data.mobileNumber,
        name: data.name,
        roles: data.roles,
        photoURL: data.photoURL,
        teamIds: [],
        statistics: {
          matches: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
        },
        isVerified: true, // User signed up through authentication
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      await setDoc(userRef, userData);
      console.log('✅ User profile created in Firestore:', uid);
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as User;
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Check if user exists by mobile number
   */
  async getUserByMobileNumber(_mobileNumber: string): Promise<User | null> {
    try {
      // This would require a Firestore query
      // For now, we'll implement this in the user service with proper indexing
      return null;
    } catch (error) {
      console.error('Error checking user by mobile:', error);
      return null;
    }
  }
}

export default new AuthService();

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import authService from '../services/auth.service';
import userService from '../services/user.service';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user profile
        let profile = await authService.getUserProfile(user.uid);

        // If profile doesn't exist, create it (for existing users)
        if (!profile) {
          console.log('🔧 Creating user profile for existing user:', user.uid);
          try {
            await authService.createUserProfile(user.uid, {
              mobileNumber: user.phoneNumber || '',
              name: user.displayName || user.phoneNumber || 'User',
              roles: ['player'],
            });
            profile = await authService.getUserProfile(user.uid);
            console.log('✅ Profile created successfully:', profile);

            // Check for and merge unverified profile
            if (user.phoneNumber) {
              try {
                await userService.verifyUser(user.phoneNumber, user.uid);
                // Reload profile after merge
                profile = await authService.getUserProfile(user.uid);
                console.log('✅ Unverified profile merged');
              } catch (error) {
                console.error('Error merging unverified profile:', error);
              }
            }
          } catch (error) {
            console.error('❌ Error creating user profile:', error);
          }
        } else {
          console.log('✅ User profile loaded:', profile);

          // Auto-sync mobile number if missing from profile but available in Firebase Auth
          if (profile && !profile.mobileNumber && user.phoneNumber) {
            console.log('📱 Auto-syncing mobile number from Firebase Auth:', user.phoneNumber);
            try {
              await authService.updateUserProfile(user.uid, {
                mobileNumber: user.phoneNumber,
              });
              // Reload profile to reflect the update
              profile = await authService.getUserProfile(user.uid);
              console.log('✅ Mobile number auto-synced on login');
            } catch (error) {
              console.error('❌ Error auto-syncing mobile number:', error);
            }
          }
        }

        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithPhone = async (phoneNumber: string): Promise<void> => {
    await authService.sendOTP(phoneNumber);
  };

  const signInWithGoogle = async (): Promise<void> => {
    const user = await authService.signInWithGoogle();
    const profile = await authService.getUserProfile(user.uid);
    setUserProfile(profile);
    setCurrentUser(user);
  };

  const verifyOTP = async (code: string): Promise<void> => {
    const user = await authService.verifyOTP(code);
    const profile = await authService.getUserProfile(user.uid);
    setUserProfile(profile);
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    await authService.updateUserProfile(currentUser.uid, data);

    // Refresh user profile
    const updatedProfile = await authService.getUserProfile(currentUser.uid);
    setUserProfile(updatedProfile);
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signInWithPhone,
    signInWithGoogle,
    verifyOTP,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

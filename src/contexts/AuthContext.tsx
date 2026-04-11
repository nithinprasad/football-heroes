import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import authService from '../services/auth.service';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
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
        const profile = await authService.getUserProfile(user.uid);
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
    verifyOTP,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

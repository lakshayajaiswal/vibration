import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from './config';
import { syncUserProfile, UserProfileData } from './firestoreService';

interface FirebaseContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProf = await syncUserProfile(firebaseUser);
          setProfile(userProf);
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res.user) {
        const p = await syncUserProfile(res.user);
        setProfile(p);
      }
    } catch (e) {
      console.error('Sign-in failed:', e);
      throw e;
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setUser(null);
      setProfile(null);
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const p = await syncUserProfile(auth.currentUser);
      setProfile(p);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return ctx;
}


"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/config/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  UserCredential
} from 'firebase/auth';
import type { z } from 'zod';
import type { LoginSchema, SignupSchema } from '@/lib/authSchemas'; // We'll create this file

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  login: (data: z.infer<typeof LoginSchema>) => Promise<UserCredential | void>;
  signup: (data: z.infer<typeof SignupSchema>) => Promise<UserCredential | void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (data: z.infer<typeof LoginSchema>) => {
    setLoading(true);
    setError(null);
    try {
      return await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
    }
  };

  const signup = async (data: z.infer<typeof SignupSchema>) => {
    setLoading(true);
    setError(null);
    try {
      return await createUserWithEmailAndPassword(auth, data.email, data.password);
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null
    } catch (e) {
      setError(e as AuthError);
    } finally {
      setLoading(false);
    }
  };
  
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

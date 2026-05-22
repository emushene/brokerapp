import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2 hours in milliseconds (2 * 60 * 60 * 1000)
const IDLE_TIMEOUT = 7200000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await signOut(auth);
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log('User idle for 2 hours, logging out...');
        logout();
      }, IDLE_TIMEOUT);
    }
  }, [user, logout]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Set initial timer
      resetTimer();

      // Listen for activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      const handleActivity = () => resetTimer();

      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [user, resetTimer]);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

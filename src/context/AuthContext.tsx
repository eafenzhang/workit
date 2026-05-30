import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { UserProfile } from '../types/profile';
import { getProfile, saveProfile as persistProfile, resetProfile as clearProfile } from '../utils/profileStorage';

interface User {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  saveProfile: (profile: UserProfile) => void;
  resetProfile: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Build a legacy User object from a UserProfile for backward compatibility */
function toLegacyUser(profile: UserProfile): User {
  return {
    id: 1,
    phone: '',
    nickname: profile.nickname,
    avatar: '',
    role: profile.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load profile from new storage key first
    const profile = getProfile();
    if (profile?.nickname) {
      setUserProfile(profile);
      setUser(toLegacyUser(profile));
    } else {
      // Fallback: read legacy 'user' key
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const legacyUser = JSON.parse(stored) as User;
          setUser(legacyUser);
        }
      } catch {
        try { localStorage.removeItem('user'); } catch {}
      }
    }
    setIsLoading(false);
  }, []);

  /** Save profile: persist to localStorage + update both states + sync legacy user */
  const saveProfile = useCallback((profile: UserProfile) => {
    const updated = { ...profile, updatedAt: new Date().toISOString() };
    persistProfile(updated);
    setUserProfile(updated);
    const legacyUser = toLegacyUser(updated);
    setUser(legacyUser);
    try { localStorage.setItem('user', JSON.stringify(legacyUser)); } catch {}
  }, []);

  /** Reset: clear localStorage + clear all states */
  const resetProfile = useCallback(() => {
    clearProfile();
    try { localStorage.removeItem('user'); } catch {}
    setUserProfile(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, userProfile, setUserProfile, saveProfile, resetProfile, isLoading }),
    [user, userProfile, saveProfile, resetProfile, isLoading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

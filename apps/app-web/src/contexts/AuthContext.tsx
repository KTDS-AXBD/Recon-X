import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { DEMO_USERS, setAuthUser } from '@/api/auth-store';
import type { DemoUser } from '@/api/auth-store';

const STORAGE_KEY = 'ai-foundry-auth-user';

interface AuthContextType {
  user: DemoUser | null;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): DemoUser | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return null;
  const found = DEMO_USERS.find((u) => u.userId === stored);
  return found ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(loadUser);

  // Sync to module-level auth store whenever user changes
  useEffect(() => {
    setAuthUser(user);
  }, [user]);

  const login = useCallback((userId: string) => {
    const found = DEMO_USERS.find((u) => u.userId === userId);
    if (found === undefined) return;
    setUser(found);
    localStorage.setItem(STORAGE_KEY, found.userId);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

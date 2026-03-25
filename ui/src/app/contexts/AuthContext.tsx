import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { leaveSubredditPresence } from '../services/subredditApi';

const USER_SERVICE_URL = 'http://localhost:8081';

interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isModerator: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwtToken'));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('redditUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('jwtToken');
    const storedUser = localStorage.getItem('redditUser');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('redditUser');
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const jwt: string = data.token;
      const backendUser = data.user;

      // Map backend UserDto to frontend User
      const userData: User = {
        id: backendUser.id,
        username: backendUser.username,
        email: backendUser.email,
        isActive: backendUser.isActive ?? backendUser.active ?? true,
        isModerator: backendUser.isModerator ?? false,
        createdAt: backendUser.createdAt,
      };

      setToken(jwt);
      setUser(userData);
      localStorage.setItem('jwtToken', jwt);
      localStorage.setItem('redditUser', JSON.stringify(userData));
      return true;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        return false;
      }

      // Auto-login after successful registration
      return await login(username, password);
    } catch {
      return false;
    }
  }, [login]);

  const logout = useCallback(async () => {
    const activeToken = token;
    const activeUsername = user?.username;

    if (activeToken && activeUsername) {
      const joinedSubredditsKey = `joinedSubreddits:${activeUsername}`;
      const rawJoined = localStorage.getItem(joinedSubredditsKey);
      if (rawJoined) {
        try {
          const joined = JSON.parse(rawJoined) as Array<{ name?: string }>;
          const uniqueNames = Array.from(
            new Set(joined.map((entry) => entry.name).filter((name): name is string => !!name))
          );

          await Promise.all(
            uniqueNames.map((name) => leaveSubredditPresence(activeToken, name).catch(() => undefined))
          );
        } catch {
          // Ignore malformed localStorage data.
        }
      }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('redditUser');
    localStorage.removeItem('joinedSubreddits');
    localStorage.removeItem('pendingModApplications');
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuthenticated: !!token && !!user }}>
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
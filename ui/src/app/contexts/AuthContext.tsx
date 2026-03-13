import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  karma: number;
  isModerator: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  signup: (username: string, email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('redditUser');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser({ ...parsed, createdAt: new Date(parsed.createdAt) });
    }
  }, []);

  const login = (username: string, password: string) => {
    // Mock login - in real app, this would call an API
    if (password.length >= 4) {
      const mockUser: User = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        username,
        email: `${username}@example.com`,
        karma: 1547,
        isModerator: username.toLowerCase() === 'admin' || username.toLowerCase() === 'moderator',
        createdAt: new Date('2023-01-15'),
      };
      setUser(mockUser);
      localStorage.setItem('redditUser', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const signup = (username: string, email: string, password: string) => {
    // Mock signup
    if (username.length >= 3 && password.length >= 6 && email.includes('@')) {
      const mockUser: User = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        username,
        email,
        karma: 1,
        isModerator: false,
        createdAt: new Date(),
      };
      setUser(mockUser);
      localStorage.setItem('redditUser', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('redditUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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
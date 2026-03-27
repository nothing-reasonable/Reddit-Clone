import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface JoinedSubreddit {
  name: string;
  role: 'member' | 'moderator';
  joinedAt: Date;
}

interface SubredditContextType {
  joinedSubreddits: JoinedSubreddit[];
  joinSubreddit: (subreddit: string, role?: 'member' | 'moderator') => void;
  leaveSubreddit: (subreddit: string) => void;
  isJoined: (subreddit: string) => boolean;
  isModerator: (subreddit: string) => boolean;
  applyAsModerator: (subreddit: string) => void;
  removePendingApplication: (subreddit: string) => void;
  pendingModApplications: string[];
}

const SubredditContext = createContext<SubredditContextType | undefined>(undefined);

export function SubredditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [joinedSubreddits, setJoinedSubreddits] = useState<JoinedSubreddit[]>([]);
  const [pendingModApplications, setPendingModApplications] = useState<string[]>([]);

  const storageScope = user?.username ? `:${user.username}` : ':guest';
  const joinedSubredditsKey = `joinedSubreddits${storageScope}`;
  const pendingModAppsKey = `pendingModApplications${storageScope}`;

  useEffect(() => {
    // Load membership state for the currently authenticated user only.
    const stored = localStorage.getItem(joinedSubredditsKey);
    const storedApps = localStorage.getItem(pendingModAppsKey);

    if (!user) {
      setJoinedSubreddits([]);
      setPendingModApplications([]);
      return;
    }

    if (stored) {
      const parsed = JSON.parse(stored);
      setJoinedSubreddits(
        parsed.map((s: any) => ({ ...s, joinedAt: new Date(s.joinedAt) }))
      );
    } else {
      setJoinedSubreddits([]);
    }

    if (storedApps) {
      setPendingModApplications(JSON.parse(storedApps));
    } else {
      setPendingModApplications([]);
    }
  }, [user, joinedSubredditsKey, pendingModAppsKey]);

  // Try to fetch pending applications from server if we have a token
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) return;
        const res = await fetch('http://localhost:8085/api/messages/applications/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingModApplications(data);
          localStorage.setItem('pendingModApplications', JSON.stringify(data));
        }
      } catch (e) {
        // ignore
      }
    };
    void fetchPending();
  }, []);

  const joinSubreddit = (subreddit: string, role: 'member' | 'moderator' = 'member') => {
    const newJoined = [
      ...joinedSubreddits.filter((s) => s.name !== subreddit),
      { name: subreddit, role, joinedAt: new Date() },
    ];
    setJoinedSubreddits(newJoined);
    localStorage.setItem(joinedSubredditsKey, JSON.stringify(newJoined));
  };

  const leaveSubreddit = (subreddit: string) => {
    const newJoined = joinedSubreddits.filter((s) => s.name !== subreddit);
    setJoinedSubreddits(newJoined);
    localStorage.setItem(joinedSubredditsKey, JSON.stringify(newJoined));
  };

  const isJoined = (subreddit: string) => {
    return joinedSubreddits.some((s) => s.name === subreddit);
  };

  const isModerator = (subreddit: string) => {
    return joinedSubreddits.some((s) => s.name === subreddit && s.role === 'moderator');
  };

  const applyAsModerator = (subreddit: string) => {
    if (!pendingModApplications.includes(subreddit)) {
      const newApps = [...pendingModApplications, subreddit];
      setPendingModApplications(newApps);
      localStorage.setItem(pendingModAppsKey, JSON.stringify(newApps));
    }
  };

  const removePendingApplication = (subreddit: string) => {
    const newApps = pendingModApplications.filter((s) => s !== subreddit);
    setPendingModApplications(newApps);
    localStorage.setItem('pendingModApplications', JSON.stringify(newApps));
  };

  return (
    <SubredditContext.Provider
      value={{
        joinedSubreddits,
        joinSubreddit,
        leaveSubreddit,
        isJoined,
        isModerator,
        applyAsModerator,
        removePendingApplication,
        pendingModApplications,
      }}
    >
      {children}
    </SubredditContext.Provider>
  );
}

export function useSubreddit() {
  const context = useContext(SubredditContext);
  if (context === undefined) {
    throw new Error('useSubreddit must be used within a SubredditProvider');
  }
  return context;
}

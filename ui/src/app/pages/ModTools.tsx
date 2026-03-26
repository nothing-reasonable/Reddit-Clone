import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import { getModQueue, getModLog } from '../services/moderationApi';
import type { ModQueueItem } from '../services/moderationApi';
import type { BannedUser, ModLogEntry, Subreddit } from '../types/domain';
import {
  Shield, Flag, Settings, Users, FileText, Mail,
  BarChart3, Gavel, Lock, Pin, UserX, Eye,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router';

export default function ModTools() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const location = useLocation();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [queueItems, setQueueItems] = useState<ModQueueItem[]>([]);
  const [modLogs, setModLogs] = useState<ModLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const bannedUsers: BannedUser[] = [];

  useEffect(() => {
    if (!subreddit) return;

    let isMounted = true;
    setIsLoading(true);

    getSubredditByName(subreddit)
      .then((subredditRecord) => {
        if (!isMounted) return;
        setSubredditData(subredditRecord);
      })
      .catch(() => {
        if (!isMounted) return;
        setSubredditData(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subreddit]);

  useEffect(() => {
    if (!subreddit || !token) return;
    getModQueue(token, subreddit).then(setQueueItems).catch(() => setQueueItems([]));
    getModLog(token, subreddit).then(setModLogs).catch(() => setModLogs([]));
  }, [subreddit, token]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading mod tools...</div>
      </div>
    );
  }

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

  if (!isModerator) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be a moderator to access Mod Tools.</p>
          <button
            onClick={() => navigate(`/r/${subreddit}`)}
            className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600"
          >
            Back to r/{subreddit}
          </button>
        </div>
      </div>
    );
  }

  const queueCount = queueItems.length;
  const subModLogs = modLogs;
  const subBanned = bannedUsers.filter((b) => b.subreddit === subreddit);

  const isActive = (path: string) => location.pathname.includes(path);

  const tools = [
    {
      label: 'Mod Queue',
      icon: Flag,
      path: `/r/${subreddit}/modqueue`,
      badge: queueCount > 0 ? queueCount : undefined,
      badgeColor: 'bg-red-500',
      description: 'Review flagged content',
    },
    {
      label: 'Mod Log',
      icon: FileText,
      path: `/r/${subreddit}/mod/log`,
      badge: subModLogs.length,
      badgeColor: 'bg-gray-500',
      description: 'View moderator actions',
    },
    {
      label: 'Banned Users',
      icon: UserX,
      path: `/r/${subreddit}/mod/banned`,
      badge: subBanned.length,
      badgeColor: 'bg-orange-500',
      description: 'Manage banned users',
    },
    {
      label: 'AutoMod',
      icon: Settings,
      path: `/r/${subreddit}/automod`,
      description: 'Automated moderation rules',
    },
    {
      label: 'Mod Mail',
      icon: Mail,
      path: `/r/${subreddit}/modmail`,
      description: 'Message conversations with users',
    },
    {
      label: 'Community Settings',
      icon: Users,
      path: `/r/${subreddit}/mod/settings`,
      description: 'Rules, flairs, and settings',
    },
    {
      label: 'Traffic Stats',
      icon: BarChart3,
      path: `/r/${subreddit}/mod/traffic`,
      description: 'Community analytics',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mod Tools</h1>
              <Link to={`/r/${subreddit}`} className="text-blue-500 hover:underline">
                r/{subreddit}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {queueCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm">
                <AlertTriangle className="w-4 h-4" />
                {queueCount} items need review
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-300 rounded p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{queueCount}</div>
          <div className="text-sm text-gray-600">Queue Items</div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{subBanned.length}</div>
          <div className="text-sm text-gray-600">Banned Users</div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{subModLogs.length}</div>
          <div className="text-sm text-gray-600">Actions Today</div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{subredditData?.moderators.length || 0}</div>
          <div className="text-sm text-gray-600">Moderators</div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.label}
            to={tool.path}
            className={`bg-white border border-gray-300 rounded p-5 hover:border-blue-400 hover:shadow-sm transition-all group ${isActive(tool.path) ? 'border-blue-500 shadow-sm' : ''
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <tool.icon className="w-5 h-5 text-gray-700 group-hover:text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {tool.label}
                    {tool.badge !== undefined && tool.badge > 0 && (
                      <span className={`${tool.badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{tool.description}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-white border border-gray-300 rounded">
        <div className="px-6 py-4 border-b border-gray-300">
          <h2 className="font-bold text-lg">Recent Mod Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {subModLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="px-6 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.action.includes('remove') || log.action.includes('ban')
                  ? 'bg-red-100 text-red-600'
                  : log.action.includes('approve')
                    ? 'bg-green-100 text-green-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                {log.action.includes('remove') ? <Gavel className="w-4 h-4" /> :
                  log.action.includes('ban') ? <UserX className="w-4 h-4" /> :
                    log.action.includes('approve') ? <Eye className="w-4 h-4" /> :
                      log.action.includes('lock') ? <Lock className="w-4 h-4" /> :
                        log.action.includes('pin') ? <Pin className="w-4 h-4" /> :
                          <Shield className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-semibold">u/{log.moderator}</span>
                  <span className="text-gray-600"> {log.action.replace(/_/g, ' ')}</span>
                  {log.targetUser && (
                    <span className="text-gray-600"> - u/{log.targetUser}</span>
                  )}
                </div>
                {log.reason && (
                  <div className="text-xs text-gray-500 truncate">{log.reason}</div>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(log.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

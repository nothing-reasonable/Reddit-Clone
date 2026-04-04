import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import { getModLog } from '../services/moderationApi';
import type { ModLogEntry, Subreddit } from '../types/domain';
import { FileText, Shield, Gavel, UserX, Eye, Lock, Pin, Tag, BookOpen, ArrowLeft, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const actionLabels: Record<string, string> = {
  remove_post: 'Removed Post',
  remove_comment: 'Removed Comment',
  approve_post: 'Approved Post',
  approve_comment: 'Approved Comment',
  ban_user: 'Banned User',
  unban_user: 'Unbanned User',
  mute_user: 'Muted User',
  lock_post: 'Locked Post',
  pin_post: 'Pinned Post',
  edit_flair: 'Edited Flair',
  update_rules: 'Updated Rules',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionIcons: Record<string, any> = {
  remove_post: Gavel,
  remove_comment: Gavel,
  approve_post: Eye,
  approve_comment: Eye,
  ban_user: UserX,
  unban_user: UserX,
  mute_user: UserX,
  lock_post: Lock,
  pin_post: Pin,
  edit_flair: Tag,
  update_rules: BookOpen,
};

const actionColors: Record<string, string> = {
  remove_post: 'bg-red-100 text-red-600',
  remove_comment: 'bg-red-100 text-red-600',
  approve_post: 'bg-green-100 text-green-600',
  approve_comment: 'bg-green-100 text-green-600',
  ban_user: 'bg-red-100 text-red-700',
  unban_user: 'bg-green-100 text-green-600',
  mute_user: 'bg-orange-100 text-orange-600',
  lock_post: 'bg-yellow-100 text-yellow-700',
  pin_post: 'bg-blue-100 text-blue-600',
  edit_flair: 'bg-purple-100 text-purple-600',
  update_rules: 'bg-blue-100 text-blue-600',
};

export default function ModLog() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterMod, setFilterMod] = useState<string>('all');
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [modLogs, setModLogs] = useState<ModLogEntry[]>([]);

  useEffect(() => {
    if (!subreddit) return;
    getSubredditByName(subreddit)
      .then(setSubredditData)
      .catch(() => setSubredditData(null));
  }, [subreddit]);

  useEffect(() => {
    if (!subreddit || !token) return;
    getModLog(token, subreddit)
      .then(setModLogs)
      .catch(() => setModLogs([]));
  }, [subreddit, token]);

  const isListedModerator = (subredditData?.moderators ?? []).some(
    (moderator) => moderator.toLowerCase() === (user?.username || '').toLowerCase()
  );

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    isListedModerator;

  if (!isModerator) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be a moderator to view the mod log.</p>
          <button onClick={() => navigate(`/r/${subreddit}`)} className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Back to r/{subreddit}
          </button>
        </div>
      </div>
    );
  }

  const logs = modLogs
    .filter((l) => l.subreddit === subreddit)
    .filter((l) => filterAction === 'all' || l.action === filterAction)
    .filter((l) => filterMod === 'all' || l.moderator === filterMod)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const uniqueMods = [...new Set(modLogs.filter((l) => l.subreddit === subreddit).map((l) => l.moderator))];
  const uniqueActions = [...new Set(modLogs.filter((l) => l.subreddit === subreddit).map((l) => l.action))];

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Moderation Log
            </h1>
            <p className="text-gray-600">r/{subreddit} - All moderator actions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action] || action}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterMod}
            onChange={(e) => setFilterMod(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Moderators</option>
            {uniqueMods.map((mod) => (
              <option key={mod} value={mod}>u/{mod}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No log entries found.</p>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = actionIcons[log.action] || Shield;
              return (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          u/{log.moderator}
                        </span>
                        <span className="font-medium">
                          {actionLabels[log.action] || log.action}
                        </span>
                        {log.targetUser && (
                          <>
                            <span className="text-gray-500">&#8594;</span>
                            <Link to={`/user/${log.targetUser}`} className="text-blue-500 hover:underline text-sm">
                              u/{log.targetUser}
                            </Link>
                          </>
                        )}
                      </div>
                      {log.targetContent && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          &ldquo;{log.targetContent}&rdquo;
                        </p>
                      )}
                      {log.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reason: {log.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-xs shrink-0 text-right whitespace-nowrap">
                      <div className="text-gray-700">{format(log.timestamp, "MMM d, yyyy 'at' h:mm a")}</div>
                      <div className="text-gray-400">{formatDistanceToNow(log.timestamp, { addSuffix: true })}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

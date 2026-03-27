import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import { getAutoModLogs } from '../services/moderationApi';
import type { AutoModLogEntry, Subreddit } from '../types/domain';
import { Bot, FileText, Trash2, Flag, Mail, Tag, Eye, Lock, Zap, ArrowLeft, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const actionLabels: Record<string, string> = {
  remove: 'Removed',
  flag: 'Flagged',
  send_modmail: 'Modmailed',
  set_flair: 'Flair Set',
  approve: 'Approved',
  lock: 'Locked',
  sticky: 'Stickied',
  nsfw: 'NSFW',
  contest_mode: 'Contest Mode',
  suggested_sort: 'Sort Set',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionIcons: Record<string, any> = {
  remove: Trash2,
  flag: Flag,
  send_modmail: Mail,
  set_flair: Tag,
  approve: Eye,
  lock: Lock,
  sticky: Zap,
  nsfw: Flag,
  contest_mode: Zap,
  suggested_sort: Zap,
};

const actionColors: Record<string, string> = {
  remove: 'bg-red-100 text-red-600',
  flag: 'bg-orange-100 text-orange-600',
  send_modmail: 'bg-blue-100 text-blue-600',
  set_flair: 'bg-purple-100 text-purple-600',
  approve: 'bg-green-100 text-green-600',
  lock: 'bg-yellow-100 text-yellow-700',
  sticky: 'bg-pink-100 text-pink-600',
  nsfw: 'bg-red-100 text-red-700',
  contest_mode: 'bg-indigo-100 text-indigo-600',
  suggested_sort: 'bg-cyan-100 text-cyan-600',
};

function normalizeTargetType(targetType?: string): 'post' | 'comment' {
  const normalized = (targetType || '').trim().toLowerCase();
  return normalized === 'comment' ? 'comment' : 'post';
}

export default function AutoModLogs() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [automodLogs, setAutomodLogs] = useState<AutoModLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subreddit) return;
    getSubredditByName(subreddit)
      .then(setSubredditData)
      .catch(() => setSubredditData(null));
  }, [subreddit]);

  useEffect(() => {
    if (!subreddit || !token) return;
    setLoading(true);
    getAutoModLogs(token, subreddit, filterAction === 'all' ? undefined : filterAction)
      .then(setAutomodLogs)
      .catch(() => setAutomodLogs([]))
      .finally(() => setLoading(false));
  }, [subreddit, token, filterAction]);

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

  if (!isModerator) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be a moderator to view AutoMod logs.</p>
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

  const logs = automodLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const uniqueActions = [...new Set(automodLogs.map((l) => l.action))];

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-green-600" />
              AutoMod Logs
            </h1>
            <p className="text-gray-600">r/{subreddit} - Automated rule actions</p>
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
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-600">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Loading AutoMod logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No log entries found.</p>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = actionIcons[log.action] || Bot;
              return (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        actionColors[log.action] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          Bot
                        </span>
                        <span className="font-medium">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            normalizeTargetType(log.targetType) === 'comment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {normalizeTargetType(log.targetType)}
                        </span>
                        {log.targetAuthor && (
                          <>
                            <span className="text-gray-500">by</span>
                            <Link to={`/user/${log.targetAuthor}`} className="text-blue-500 hover:underline text-sm">
                              u/{log.targetAuthor}
                            </Link>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                        <span className="font-medium">Rule:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{log.ruleName}</code>
                      </div>
                      {log.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          Message: {log.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-xs shrink-0 text-right">
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

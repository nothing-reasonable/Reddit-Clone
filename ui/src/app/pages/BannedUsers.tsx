import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import type { BannedUser as BannedUserType, Subreddit } from '../types/domain';
import { UserX, ArrowLeft, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function BannedUsers() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [banned, setBanned] = useState<BannedUserType[]>([]);
  const [showBanForm, setShowBanForm] = useState(false);
  const [newBan, setNewBan] = useState({ username: '', reason: '', permanent: true, duration: '30' });

  useEffect(() => {
    if (!subreddit) return;

    setIsLoading(true);
    getSubredditByName(subreddit)
      .then((record) => setSubredditData(record))
      .catch(() => setSubredditData(null))
      .finally(() => setIsLoading(false));
  }, [subreddit]);

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading banned users...</div>
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <button onClick={() => navigate(`/r/${subreddit}`)} className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Back to r/{subreddit}
          </button>
        </div>
      </div>
    );
  }

  const handleBan = () => {
    if (!newBan.username.trim() || !newBan.reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    const ban = {
      username: newBan.username,
      subreddit: subreddit!,
      reason: newBan.reason,
      bannedBy: user!.username,
      bannedAt: new Date(),
      permanent: newBan.permanent,
      ...(newBan.permanent ? {} : {
        expiresAt: new Date(Date.now() + parseInt(newBan.duration) * 24 * 60 * 60 * 1000),
      }),
    };
    setBanned([...banned, ban]);
    setNewBan({ username: '', reason: '', permanent: true, duration: '30' });
    setShowBanForm(false);
    toast.success(`u/${newBan.username} has been banned from r/${subreddit}`);
  };

  const handleUnban = (username: string) => {
    setBanned(banned.filter((b) => b.username !== username));
    toast.success(`u/${username} has been unbanned from r/${subreddit}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <UserX className="w-6 h-6 text-red-500" />
                Banned Users
              </h1>
              <p className="text-gray-600">r/{subreddit} - {banned.length} banned user{banned.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setShowBanForm(true)}
            className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
          >
            <Plus className="w-4 h-4" />
            Ban User
          </button>
        </div>
      </div>

      {/* Ban Form Modal */}
      {showBanForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-300">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Ban User from r/{subreddit}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={newBan.username}
                  onChange={(e) => setNewBan({ ...newBan, username: e.target.value })}
                  placeholder="Enter username to ban"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Reason</label>
                <textarea
                  value={newBan.reason}
                  onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
                  placeholder="Reason for banning"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBan.permanent}
                    onChange={(e) => setNewBan({ ...newBan, permanent: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Permanent ban</span>
                </label>
              </div>
              {!newBan.permanent && (
                <div>
                  <label className="block text-sm font-medium mb-2">Duration (days)</label>
                  <select
                    value={newBan.duration}
                    onChange={(e) => setNewBan({ ...newBan, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-300 flex gap-3 justify-end">
              <button onClick={() => setShowBanForm(false)} className="px-6 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleBan} className="px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600">
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banned Users List */}
      <div className="bg-white border border-gray-300 rounded">
        {banned.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <UserX className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-semibold mb-1">No banned users</p>
            <p className="text-sm">This community has no banned users.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {banned.map((ban) => (
              <div key={ban.username} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/user/${ban.username}`} className="font-semibold text-blue-500 hover:underline">
                        u/{ban.username}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ban.permanent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {ban.permanent ? 'Permanent' : 'Temporary'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{ban.reason}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Banned by u/{ban.bannedBy}</span>
                      <span>&#8226;</span>
                      <span>{formatDistanceToNow(ban.bannedAt, { addSuffix: true })}</span>
                      {!ban.permanent && ban.expiresAt && (
                        <>
                          <span>&#8226;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {formatDistanceToNow(ban.expiresAt, { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnban(ban.username)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Unban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

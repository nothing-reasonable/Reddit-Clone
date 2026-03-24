import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import { getModQueue, approveModItem, removeModItem } from '../services/moderationApi';
import type { ModQueueItem } from '../services/moderationApi';
import type { Subreddit } from '../types/domain';
import { Flag, CheckCircle, XCircle, Eye, Square, CheckSquare, Trash2, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

const REPORTED_USERS: Array<{ username: string; reason: string; reportCount: number; reportedAt: Date }> = [];

export default function ModQueue() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [queueItems, setQueueItems] = useState<ModQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!subreddit || !token) return;

    let isMounted = true;
    setIsLoading(true);
    setAccessDenied(false);

    Promise.all([
      getSubredditByName(subreddit).catch(() => null),
      getModQueue(token, subreddit)
    ])
      .then(([subredditRecord, items]) => {
        if (!isMounted) return;
        setSubredditData(subredditRecord);
        setQueueItems(items);
        setAccessDenied(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('ModQueue error:', error);
        // If we get a 403 or authorization error, user is not a moderator
        const errorMsg = error?.message || '';
        if (errorMsg.includes('403') || errorMsg.includes('Moderator')) {
          setAccessDenied(true);
        } else {
          // For other errors, still try to load subreddit data
          getSubredditByName(subreddit)
            .then(sr => { if (isMounted) setSubredditData(sr); })
            .catch(() => {});
        }
        setQueueItems([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subreddit, token]);

  const isModerator = !accessDenied && (isSubredditModerator(subreddit || '') || (user?.isModerator && subredditData?.moderators.includes(user.username)));

  const [filter, setFilter] = useState<'all' | 'posts' | 'comments' | 'users'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());

  const refetchQueue = async () => {
    if (!token || !subreddit) return;
    try {
      const items = await getModQueue(token, subreddit);
      setQueueItems(items);
    } catch (err) {
      console.error('Failed to refresh queue:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading moderation queue...</div>
      </div>
    );
  }

  if (!isModerator || accessDenied) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be a moderator to access the mod queue.</p>
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

  const handleApprove = async (itemId: string) => {
    if (!token || !subreddit) return;
    try {
      const item = queueItems.find((i) => i.id === itemId);
      
      await approveModItem(token, subreddit, itemId, item?.type as any, item?.postId);
      setApprovedItems(new Set(approvedItems).add(itemId));
      setSelectedItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
      
      // If post is approved, also mark all its comments as approved
      if (item?.type === 'post') {
        const relatedComments = queueItems.filter((q) => q.type === 'comment' && q.postId === itemId);
        relatedComments.forEach((comment) => {
          setApprovedItems((prev) => new Set(prev).add(comment.id));
        });
      }
      
      toast.success(`${item?.type === 'comment' ? 'Comment' : 'Post'} approved`);
      
      // Refresh queue after approval
      setTimeout(() => refetchQueue(), 500);
    } catch (error) {
      toast.error(`Failed to approve ${queueItems.find((i) => i.id === itemId)?.type || 'item'}`);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!token || !subreddit) return;
    try {
      const item = queueItems.find((i) => i.id === itemId);
      
      await removeModItem(token, subreddit, itemId, item?.type as any, item?.postId);
      setRemovedItems(new Set(removedItems).add(itemId));
      setSelectedItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
      
      // If post is removed, also mark all its comments as removed
      if (item?.type === 'post') {
        const relatedComments = queueItems.filter((q) => q.type === 'comment' && q.postId === itemId);
        relatedComments.forEach((comment) => {
          setRemovedItems((prev) => new Set(prev).add(comment.id));
        });
      }
      
      toast.success(`${item?.type === 'comment' ? 'Comment' : 'Post'} removed`);
      
      // Refresh queue after removal
      setTimeout(() => refetchQueue(), 500);
    } catch (error) {
      toast.error(`Failed to remove ${queueItems.find((i) => i.id === itemId)?.type || 'item'}`);
    }
  };

  const toggleSelect = (itemId: string) => {
    setSelectedItems((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });
  };

  const visibleItems = queueItems.filter(
    (item) => !removedItems.has(item.id) && !approvedItems.has(item.id)
  );

  const postItems = visibleItems.filter((item) => item.type === 'post');
  const commentItems = visibleItems.filter((item) => item.type === 'comment');

  const allVisibleIds = filter === 'all' ? visibleItems.map((i) => i.id) : filter === 'posts' ? postItems.map((i) => i.id) : [];

  const selectAll = () => {
    const ids = filter === 'all' ? visibleItems.map((i) => i.id) : filter === 'posts' ? postItems.map((i) => i.id) : [];
    if (selectedItems.size === ids.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(ids));
  };

  const handleBulkApprove = async () => {
    if (!token || !subreddit) return;
    const ids = Array.from(selectedItems);
    await Promise.allSettled(ids.map((id) => approveModItem(token, subreddit, id)));
    const newApproved = new Set(approvedItems);
    ids.forEach((id) => newApproved.add(id));
    setApprovedItems(newApproved);
    toast.success(`${ids.length} items approved`);
    setSelectedItems(new Set());
    // Refresh queue after bulk approve
    setTimeout(() => refetchQueue(), 500);
  };

  const handleBulkRemove = async () => {
    if (!token || !subreddit) return;
    const ids = Array.from(selectedItems);
    await Promise.allSettled(ids.map((id) => removeModItem(token, subreddit, id)));
    const newRemoved = new Set(removedItems);
    ids.forEach((id) => newRemoved.add(id));
    setRemovedItems(newRemoved);
    toast.success(`${ids.length} items removed`);
    setSelectedItems(new Set());
    // Refresh queue after bulk remove
    setTimeout(() => refetchQueue(), 500);
  };

  const totalItems =
    filter === 'all'
      ? visibleItems.length
      : filter === 'posts'
      ? postItems.length
      : filter === 'comments'
      ? commentItems.length
      : REPORTED_USERS.length;

  const tabs = [
    { id: 'all' as const, label: 'All', count: visibleItems.length },
    { id: 'posts' as const, label: 'Posts', count: postItems.length },
    { id: 'comments' as const, label: 'Comments', count: commentItems.length },
    { id: 'users' as const, label: 'Users', count: REPORTED_USERS.length },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flag className="w-6 h-6 text-red-500" />
              Moderation Queue - r/{subreddit}
            </h1>
            <p className="text-gray-600">Review reported content</p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/r/${subreddit}/mod`}
              className="px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 text-sm"
            >
              Mod Tools
            </Link>
            <Link
              to={`/r/${subreddit}/automod`}
              className="px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 text-sm"
            >
              AutoMod Settings
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0 border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); setSelectedItems(new Set()); }}
              className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm transition-colors ${
                filter === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.id === 'users' && <Users className="w-4 h-4" />}
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedItems.size > 0 && filter !== 'users' && (
        <div className="bg-blue-50 border border-blue-200 rounded mb-4 px-4 py-3 flex items-center gap-3">
          <span className="font-semibold text-sm text-blue-700">{selectedItems.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 text-white rounded-full text-sm font-semibold hover:bg-green-600"
          >
            <ShieldCheck className="w-4 h-4" />
            Approve All
          </button>
          <button
            onClick={handleBulkRemove}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Remove All
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="px-3 py-1.5 border border-gray-300 rounded-full text-sm font-semibold hover:bg-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Select All */}
      {filter !== 'users' && allVisibleIds.length > 0 && (
        <div className="mb-2 px-1">
          <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            {selectedItems.size === allVisibleIds.length ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select all
          </button>
        </div>
      )}

      {/* Queue Items */}
      <div className="space-y-4">
        {filter === 'users' ? (
          REPORTED_USERS.length === 0 ? (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Reported Users</h2>
            </div>
          ) : (
            REPORTED_USERS.map((u) => (
              <div key={u.username} className="bg-white border-2 border-orange-300 rounded p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Flag className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-orange-600">REPORTED USER</span>
                      <span className="text-gray-600">&#8226;</span>
                      <span className="text-sm font-semibold">u/{u.username}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{u.reason}</p>
                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {u.reportCount} reports
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toast.success(`u/${u.username} dismissed`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Dismiss
                    </button>
                    <button
                      onClick={() => toast.success(`u/${u.username} banned`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                      Ban
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : totalItems === 0 ? (
          <div className="bg-white border border-gray-300 rounded p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">All Clear!</h2>
            <p className="text-gray-600">No reported items in the queue.</p>
          </div>
        ) : (
          (filter === 'all' ? visibleItems : filter === 'posts' ? postItems : filter === 'comments' ? commentItems : []).map((item) => (
            <div key={item.id} className="bg-white border-2 border-red-300 rounded p-4">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button onClick={() => toggleSelect(item.id)} className="mt-1 shrink-0">
                  {selectedItems.has(item.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    <span className={`font-bold ${item.reportCount > 0 ? 'text-red-500' : 'text-yellow-600'}`}>
                      {item.reportCount > 0 ? 'USER REPORTED' : 'FLAGGED BY AUTOMOD'} {item.type === 'comment' ? 'COMMENT' : 'POST'}
                    </span>
                    <span className="text-gray-600">&#8226;</span>
                    <span className="text-sm text-gray-600">by u/{item.author}</span>
                    {item.reportCount > 0 && (
                      <>
                        <span className="text-gray-600">&#8226;</span>
                        <span className="text-sm text-gray-600">{item.reportCount} report{item.reportCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{item.contentTitle}</h3>
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{item.contentBody}</p>
                  {item.flagReason && (
                    <div className={`inline-block px-3 py-1 text-sm rounded-full ${
                      item.reportCount > 0 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.reportCount > 0 ? 'Reason: ' : 'AutoMod Reason: '}{item.flagReason}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    to={item.type === 'comment' ? `#` : `/r/${subreddit}/comments/${item.id}`}
                    onClick={(e) => {
                      if (item.type === 'comment') {
                        e.preventDefault();
                        toast.info('Comment viewing not yet implemented');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    <XCircle className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

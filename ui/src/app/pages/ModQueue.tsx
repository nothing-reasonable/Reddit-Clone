import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { posts, comments, subreddits } from '../data/mockData';
import { useState } from 'react';
import { Flag, CheckCircle, XCircle, Eye, Square, CheckSquare, Trash2, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_REPORTED_USERS = [
  { username: 'trollUser42', reason: 'Harassment in multiple threads', reportCount: 5, reportedAt: new Date('2026-02-26T05:00:00') },
  { username: 'spamAccount99', reason: 'Posting spam links repeatedly', reportCount: 8, reportedAt: new Date('2026-02-25T20:00:00') },
];

export default function ModQueue() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();

  const subredditData = subreddits.find((s) => s.name === subreddit);
  const isModerator = isSubredditModerator(subreddit || '') || (user?.isModerator && subredditData?.moderators.includes(user.username));

  const [filter, setFilter] = useState<'all' | 'posts' | 'comments' | 'users'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const flaggedPosts = posts.filter((p) => p.subreddit === subreddit && p.flagged && !p.removed);
  const flaggedComments = comments.filter((c) => {
    const post = posts.find((p) => p.id === c.postId);
    return post?.subreddit === subreddit && c.flagged && !c.removed;
  });

  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());

  if (!isModerator) {
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

  const handleApprove = (itemId: string, type: 'post' | 'comment') => {
    setApprovedItems(new Set(approvedItems).add(itemId));
    setSelectedItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
    toast.success(`${type === 'post' ? 'Post' : 'Comment'} approved`);
  };

  const handleRemove = (itemId: string, type: 'post' | 'comment') => {
    setRemovedItems(new Set(removedItems).add(itemId));
    setSelectedItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
    toast.success(`${type === 'post' ? 'Post' : 'Comment'} removed`);
  };

  const toggleSelect = (itemId: string) => {
    setSelectedItems((prev) => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });
  };

  const visiblePosts = flaggedPosts.filter(
    (p) => !removedItems.has(p.id) && !approvedItems.has(p.id)
  );
  const visibleComments = flaggedComments.filter(
    (c) => !removedItems.has(c.id) && !approvedItems.has(c.id)
  );

  const allVisibleIds = [
    ...(filter === 'all' || filter === 'posts' ? visiblePosts.map((p) => p.id) : []),
    ...(filter === 'all' || filter === 'comments' ? visibleComments.map((c) => c.id) : []),
  ];

  const selectAll = () => {
    if (selectedItems.size === allVisibleIds.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(allVisibleIds));
  };

  const handleBulkApprove = () => {
    const newApproved = new Set(approvedItems);
    selectedItems.forEach((id) => newApproved.add(id));
    setApprovedItems(newApproved);
    toast.success(`${selectedItems.size} items approved`);
    setSelectedItems(new Set());
  };

  const handleBulkRemove = () => {
    const newRemoved = new Set(removedItems);
    selectedItems.forEach((id) => newRemoved.add(id));
    setRemovedItems(newRemoved);
    toast.success(`${selectedItems.size} items removed`);
    setSelectedItems(new Set());
  };

  const totalItems =
    filter === 'all'
      ? visiblePosts.length + visibleComments.length
      : filter === 'posts'
      ? visiblePosts.length
      : filter === 'comments'
      ? visibleComments.length
      : MOCK_REPORTED_USERS.length;

  const tabs = [
    { id: 'all' as const, label: 'All', count: visiblePosts.length + visibleComments.length },
    { id: 'posts' as const, label: 'Posts', count: visiblePosts.length },
    { id: 'comments' as const, label: 'Comments', count: visibleComments.length },
    { id: 'users' as const, label: 'Users', count: MOCK_REPORTED_USERS.length },
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
            <p className="text-gray-600">Review flagged content from AutoMod</p>
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
          // Users tab
          MOCK_REPORTED_USERS.length === 0 ? (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Reported Users</h2>
            </div>
          ) : (
            MOCK_REPORTED_USERS.map((u) => (
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
            <p className="text-gray-600">No flagged items in the queue.</p>
          </div>
        ) : (
          <>
            {/* Flagged Posts */}
            {(filter === 'all' || filter === 'posts') &&
              visiblePosts.map((post) => (
                <div key={post.id} className="bg-white border-2 border-red-300 rounded p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(post.id)} className="mt-1 shrink-0">
                      {selectedItems.has(post.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Flag className="w-4 h-4 text-red-500" />
                        <span className="font-bold text-red-500">FLAGGED POST</span>
                        <span className="text-gray-600">&#8226;</span>
                        <span className="text-sm text-gray-600">by u/{post.author}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{post.content}</p>
                      <div className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                        Reason: {post.flagReason}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        to={`/r/${post.subreddit}/comments/${post.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      <button
                        onClick={() => handleApprove(post.id, 'post')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRemove(post.id, 'post')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        <XCircle className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Flagged Comments */}
            {(filter === 'all' || filter === 'comments') &&
              visibleComments.map((comment) => {
                const post = posts.find((p) => p.id === comment.postId);
                return (
                  <div key={comment.id} className="bg-white border-2 border-red-300 rounded p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button onClick={() => toggleSelect(comment.id)} className="mt-1 shrink-0">
                        {selectedItems.has(comment.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="w-4 h-4 text-red-500" />
                          <span className="font-bold text-red-500">FLAGGED COMMENT</span>
                          <span className="text-gray-600">&#8226;</span>
                          <span className="text-sm text-gray-600">by u/{comment.author}</span>
                          <span className="text-gray-600">&#8226;</span>
                          <span className="text-sm text-gray-600">on "{post?.title}"</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                        <div className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                          Reason: {comment.flagReason}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link
                          to={`/r/${post?.subreddit}/comments/${post?.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        <button
                          onClick={() => handleApprove(comment.id, 'comment')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRemove(comment.id, 'comment')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          <XCircle className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}

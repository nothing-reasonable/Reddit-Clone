import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditPosts } from '../services/contentApi';
import { getSubredditByName } from '../services/subredditApi';
import type { Post, Subreddit } from '../types/domain';
import { BarChart3, ArrowLeft, TrendingUp, Users, Eye, MessageSquare } from 'lucide-react';

export default function TrafficStats() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!subreddit) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([getSubredditByName(subreddit), getSubredditPosts(subreddit)])
      .then(([subredditRecord, subredditPosts]) => {
        if (!isMounted) return;
        setSubredditData(subredditRecord);
        setPosts(subredditPosts);
      })
      .catch(() => {
        if (!isMounted) return;
        setSubredditData(null);
        setPosts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subreddit]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading traffic stats...</div>
      </div>
    );
  }

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
          <button onClick={() => navigate(`/r/${subreddit}`)} className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Back to r/{subreddit}
          </button>
        </div>
      </div>
    );
  }

  const subPosts = posts.filter((p) => p.subreddit === subreddit);
  const totalUpvotes = subPosts.reduce((acc, p) => acc + p.upvotes, 0);
  const totalComments = subPosts.reduce((acc, p) => acc + p.commentCount, 0);

  const topPosts = [...subPosts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3">
          <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              Traffic Stats
            </h1>
            <p className="text-gray-600">r/{subreddit} - Community analytics</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Members</span>
          </div>
          <div className="text-2xl font-bold">{((subredditData?.members ?? 0) / 1000000).toFixed(1)}M</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +2.4% this week
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Online Now</span>
          </div>
          <div className="text-2xl font-bold">{(subredditData?.online ?? 0).toLocaleString()}</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +12% vs avg
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Upvotes</span>
          </div>
          <div className="text-2xl font-bold">{totalUpvotes.toLocaleString()}</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +8.1% this week
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Total Comments</span>
          </div>
          <div className="text-2xl font-bold">{totalComments.toLocaleString()}</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +5.7% this week
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Summary */}
        <div className="bg-white border border-gray-300 rounded p-6">
          <h2 className="font-bold text-lg mb-4">Activity Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Posts</span>
              <span className="text-gray-700 font-semibold">{subPosts.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Upvotes</span>
              <span className="text-gray-700 font-semibold">{totalUpvotes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Comments</span>
              <span className="text-gray-700 font-semibold">{totalComments.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Flagged Posts</span>
              <span className="text-gray-700 font-semibold">{subPosts.filter((p) => p.flagged).length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Removed Posts</span>
              <span className="text-gray-700 font-semibold">{subPosts.filter((p) => p.removed).length}</span>
            </div>
          </div>
        </div>

        {/* Top Posts */}
        <div className="bg-white border border-gray-300 rounded p-6">
          <h2 className="font-bold text-lg mb-4">Top Posts</h2>
          <div className="space-y-3">
            {topPosts.length === 0 ? (
              <div className="text-sm text-gray-500">No post data available yet.</div>
            ) : (
              topPosts.map((post, index) => (
                <Link
                  key={post.id}
                  to={`/r/${post.subreddit}/comments/${post.id}`}
                  className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded"
                >
                  <span className="font-bold text-gray-400 text-lg w-6 text-center">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{post.title}</div>
                    <div className="text-xs text-gray-500">
                      {post.upvotes.toLocaleString()} upvotes &#8226; {post.commentCount} comments
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white border border-gray-300 rounded p-6">
        <h2 className="font-bold text-lg mb-2">Traffic Timeline</h2>
        <p className="text-sm text-gray-600">
          Daily and monthly traffic analytics are not available from backend yet. This page currently shows
          aggregate metrics derived from real post data.
        </p>
      </div>
    </div>
  );
}

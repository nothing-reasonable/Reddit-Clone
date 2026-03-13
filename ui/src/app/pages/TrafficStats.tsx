import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { subreddits, posts } from '../data/mockData';
import { BarChart3, ArrowLeft, TrendingUp, Users, Eye, MessageSquare } from 'lucide-react';

export default function TrafficStats() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();

  const subredditData = subreddits.find((s) => s.name === subreddit);
  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

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

  // Mock traffic data
  const dailyViews = [
    { day: 'Mon', views: 12400, posts: 45, comments: 234 },
    { day: 'Tue', views: 15600, posts: 52, comments: 287 },
    { day: 'Wed', views: 18200, posts: 61, comments: 345 },
    { day: 'Thu', views: 14800, posts: 48, comments: 256 },
    { day: 'Fri', views: 21300, posts: 73, comments: 412 },
    { day: 'Sat', views: 28900, posts: 89, comments: 567 },
    { day: 'Sun', views: 25400, posts: 76, comments: 489 },
  ];

  const maxViews = Math.max(...dailyViews.map((d) => d.views));

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
          <div className="text-2xl font-bold">{(subredditData!.members / 1000000).toFixed(1)}M</div>
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
          <div className="text-2xl font-bold">{subredditData!.online.toLocaleString()}</div>
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

      {/* Daily Views Bar Chart */}
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <h2 className="font-bold text-lg mb-4">Page Views (This Week)</h2>
        <div className="flex items-end gap-3 h-48">
          {dailyViews.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-semibold text-gray-600">
                {(day.views / 1000).toFixed(1)}k
              </div>
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: '8px' }}
                title={`${day.views.toLocaleString()} views`}
              />
              <div className="text-xs font-medium text-gray-600">{day.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Activity */}
        <div className="bg-white border border-gray-300 rounded p-6">
          <h2 className="font-bold text-lg mb-4">Daily Activity</h2>
          <div className="space-y-3">
            {dailyViews.map((day) => (
              <div key={day.day} className="flex items-center justify-between text-sm">
                <span className="font-medium w-10">{day.day}</span>
                <div className="flex items-center gap-4 text-gray-600">
                  <span>{day.posts} posts</span>
                  <span>{day.comments} comments</span>
                  <span className="font-semibold text-gray-900">{(day.views / 1000).toFixed(1)}k views</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Posts */}
        <div className="bg-white border border-gray-300 rounded p-6">
          <h2 className="font-bold text-lg mb-4">Top Posts</h2>
          <div className="space-y-3">
            {topPosts.map((post, index) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Growth Chart Mock */}
      <div className="mt-4 bg-white border border-gray-300 rounded p-6">
        <h2 className="font-bold text-lg mb-4">Member Growth (Last 30 Days)</h2>
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 30 }, (_, i) => {
            const base = 70 + Math.sin(i / 5) * 15 + Math.random() * 20;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-green-400 rounded-t hover:bg-green-500 transition-colors"
                  style={{ height: `${base}%`, minHeight: '4px' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

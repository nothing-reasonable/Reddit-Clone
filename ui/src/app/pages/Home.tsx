import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PostCard from '../components/PostCard';
import { formatNumber } from '../utils/format';
import { TrendingUp, Sparkles, Clock, Flame, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getGlobalPosts } from '../services/contentApi';
import { getAllSubreddits } from '../services/subredditApi';
import type { Post, Subreddit } from '../types/domain';

export default function Home() {
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [posts, setPosts] = useState<Post[]>([]);
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [loadedPosts, loadedSubreddits] = await Promise.all([
          getGlobalPosts(sortBy),
          getAllSubreddits(),
        ]);
        if (cancelled) return;
        setPosts(loadedPosts);
        setSubreddits(loadedSubreddits);
      } catch {
        if (cancelled) return;
        setPosts([]);
        setSubreddits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [sortBy]);

  const sortedPosts = [...posts].filter((p) => !p.removed).sort((a, b) => {
    if (sortBy === 'hot') {
      return b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
    } else if (sortBy === 'new') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else if (sortBy === 'rising') {
      const aRatio = a.upvotes / (a.downvotes || 1);
      const bRatio = b.upvotes / (b.downvotes || 1);
      return bRatio - aRatio;
    } else {
      return b.upvotes - a.upvotes;
    }
  });

  const sortOptions = [
    { id: 'hot' as const, label: 'Hot', icon: Flame },
    { id: 'new' as const, label: 'New', icon: Sparkles },
    { id: 'top' as const, label: 'Top', icon: TrendingUp },
    { id: 'rising' as const, label: 'Rising', icon: Clock },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 flex gap-4">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Create Post Prompt */}
        {isAuthenticated && (
          <Link
            to="/submit"
            className="flex items-center gap-3 bg-white border border-gray-300 rounded p-2 mb-3 hover:border-gray-400 transition-colors"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 bg-gray-50 rounded-full px-4 py-1.5 text-sm text-gray-500 hover:bg-white hover:border hover:border-orange-500 transition-colors border border-gray-200">
              Create Post
            </div>
          </Link>
        )}

        {/* Sort Options */}
        <div className="bg-white border border-gray-300 rounded mb-3 p-2 flex gap-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                sortBy === opt.id
                  ? 'bg-gray-200 font-semibold'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <opt.icon className="w-4 h-4" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="space-y-3">
          {loading && (
            <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-500">
              Loading posts...
            </div>
          )}
          {!loading && sortedPosts.length === 0 && (
            <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-500">
              No posts available yet.
            </div>
          )}
          {!loading && sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0">
        {/* Premium Banner */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-500 text-lg">⭐</span>
            </div>
            <div>
              <div className="font-bold text-sm">Reddit Premium</div>
              <div className="text-xs text-gray-500">The best Reddit experience</div>
            </div>
          </div>
          <button className="w-full py-1.5 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors">
            Try Now
          </button>
        </div>

        {/* Trending Communities */}
        <div className="bg-white border border-gray-300 rounded sticky top-16 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3">
            <h2 className="font-bold text-white text-sm">Top Communities</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {subreddits.map((sub, index) => (
              <Link
                key={sub.name}
                to={`/r/${sub.name}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-bold text-gray-400 w-5">{index + 1}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl shrink-0">{sub.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">r/{sub.name}</div>
                    <div className="text-xs text-gray-500">{formatNumber(sub.members)} members</div>
                  </div>
                </div>
                {index < 3 && (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                )}
              </Link>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200">
            <button className="w-full py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 transition-colors">
              View All
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 px-3 text-xs text-gray-400 space-y-1">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="hover:underline cursor-pointer">Help</span>
            <span className="hover:underline cursor-pointer">About</span>
            <span className="hover:underline cursor-pointer">Careers</span>
            <span className="hover:underline cursor-pointer">Press</span>
            <span className="hover:underline cursor-pointer">Blog</span>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="hover:underline cursor-pointer">Terms</span>
            <span className="hover:underline cursor-pointer">Content Policy</span>
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
          </div>
          <p className="pt-1">Reddit Clone &copy; 2026</p>
        </div>
      </aside>
    </div>
  );
}

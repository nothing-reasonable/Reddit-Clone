import { useSearchParams, Link } from 'react-router';
import { useEffect, useState } from 'react';
import PostCard from '../components/PostCard';
import { Search, Users, FileText, MessageSquare } from 'lucide-react';
import type { Post, Subreddit } from '../types/domain';
import { searchCommunities, searchPosts } from '../services/communityApi';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'comments'>('posts');
  const [matchedPosts, setMatchedPosts] = useState<Post[]>([]);
  const [matchedSubs, setMatchedSubs] = useState<Subreddit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      if (!query.trim()) {
        setMatchedPosts([]);
        setMatchedSubs([]);
        return;
      }

      setLoading(true);
      try {
        const [posts, communities] = await Promise.all([
          searchPosts(query),
          searchCommunities(query),
        ]);
        if (cancelled) return;
        setMatchedPosts(posts);
        setMatchedSubs(communities);
      } catch {
        if (cancelled) return;
        setMatchedPosts([]);
        setMatchedSubs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const tabs = [
    { id: 'posts' as const, label: 'Posts', icon: FileText, count: matchedPosts.length },
    { id: 'communities' as const, label: 'Communities', icon: Users, count: matchedSubs.length },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare, count: 0 },
  ];

  if (!query) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold mb-2">Search Reddit</h1>
          <p className="text-gray-600">Enter a search term to find posts, communities, and comments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4">
        <div className="px-6 py-4 border-b border-gray-300">
          <h1 className="text-lg">
            Search results for <span className="font-bold">&ldquo;{query}&rdquo;</span>
          </h1>
        </div>
        <div className="flex border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <p className="text-gray-600">Searching posts...</p>
            </div>
          ) : matchedPosts.length > 0 ? (
            matchedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <p className="text-gray-600">No posts found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Communities */}
      {activeTab === 'communities' && (
        <div className="space-y-3">
          {matchedSubs.length > 0 ? (
            matchedSubs.map((sub) => (
              <Link
                key={sub.name}
                to={`/r/${sub.name}`}
                className="flex items-center gap-4 bg-white border border-gray-300 rounded p-4 hover:border-gray-400 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                  {sub.icon}
                </div>
                <div className="flex-1">
                  <div className="font-bold">r/{sub.name}</div>
                  <div className="text-sm text-gray-600">{sub.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(sub.members / 1000000).toFixed(1)}M members &#8226; {sub.online.toLocaleString()} online
                  </div>
                </div>
                <button className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600">
                  Join
                </button>
              </Link>
            ))
          ) : (
            <div className="bg-white border border-gray-300 rounded p-8 text-center">
              <p className="text-gray-600">No communities found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      {activeTab === 'comments' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-300 rounded p-8 text-center">
            <p className="text-gray-600">Comment search is not available yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}

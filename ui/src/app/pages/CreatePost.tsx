import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { FileText, Link as LinkIcon, Image, List, ChevronDown, Tag } from 'lucide-react';
import { getAllSubreddits } from '../services/subredditApi';
import { createPost } from '../services/contentApi';
import type { Subreddit } from '../types/domain';

export default function CreatePost() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSub = searchParams.get('subreddit') || 'programming';
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState(initialSub);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flair, setFlair] = useState('');
  const [postType, setPostType] = useState<'text' | 'link' | 'image' | 'poll'>('text');
  const [linkUrl, setLinkUrl] = useState('');
  const [showSubSelect, setShowSubSelect] = useState(false);
  const [showFlairDropdown, setShowFlairDropdown] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCommunities() {
      setLoadingCommunities(true);
      try {
        const data = await getAllSubreddits();
        if (cancelled) return;
        setSubreddits(data);
        if (data.length > 0) {
          const exists = data.some((s) => s.name === initialSub);
          setSelectedSubreddit(exists ? initialSub : data[0].name);
        }
      } catch {
        if (!cancelled) setSubreddits([]);
      } finally {
        if (!cancelled) setLoadingCommunities(false);
      }
    }

    void loadCommunities();
    return () => {
      cancelled = true;
    };
  }, [initialSub]);

  const selectedSub = subreddits.find((s) => s.name === selectedSubreddit);
  const selectedSubIsArchived = !!selectedSub?.archived;

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Login Required</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to create a post.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Log In
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (postType === 'link' && !linkUrl.trim()) {
      toast.error('URL is required for link posts');
      return;
    }
    if (!token) {
      toast.error('Please log in again to post');
      return;
    }
    if (selectedSubIsArchived) {
      toast.error('This community is archived. Posting is disabled.');
      return;
    }

    try {
      await createPost(token, selectedSubreddit, {
        title: title.trim(),
        content: content.trim(),
        type: postType,
        url: postType === 'link' ? linkUrl.trim() : undefined,
        flair: flair || undefined,
      });
      toast.success('Post created successfully!');
      navigate(`/r/${selectedSubreddit}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  const tabs = [
    { id: 'text' as const, label: 'Post', icon: FileText },
    { id: 'link' as const, label: 'Link', icon: LinkIcon },
    { id: 'image' as const, label: 'Image', icon: Image },
    { id: 'poll' as const, label: 'Poll', icon: List },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-3">
        <h1 className="text-lg font-semibold">Create a post</h1>
      </div>

      {/* Subreddit Selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowSubSelect(!showSubSelect)}
          className="flex items-center gap-2 bg-white border border-gray-300 rounded px-4 py-2 w-72 hover:border-gray-400"
        >
          <span className="text-lg">{selectedSub?.icon}</span>
          <span className="font-medium text-sm flex-1 text-left">r/{selectedSubreddit}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {showSubSelect && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {loadingCommunities && <div className="px-4 py-2 text-sm text-gray-500">Loading communities...</div>}
            {subreddits.map((sub) => (
              <button
                key={sub.name}
                onClick={() => {
                  if (sub.archived) {
                    return;
                  }
                  setSelectedSubreddit(sub.name);
                  setShowSubSelect(false);
                  setFlair('');
                }}
                disabled={sub.archived}
                className={`flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-left ${
                  selectedSubreddit === sub.name ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-lg">{sub.icon}</span>
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span>r/{sub.name}</span>
                    {sub.archived && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Archived</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{sub.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSubIsArchived && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">
          r/{selectedSubreddit} is archived. Posting is disabled.
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded overflow-hidden">
        {/* Post Type Tabs */}
        <div className="flex border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPostType(tab.id)}
              className={`flex items-center justify-center gap-2 flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                postType === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              maxLength={300}
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/300</p>
          </div>

          {/* Flair Selection */}
          {selectedSub && selectedSub.flairs.length > 0 && (
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Flair</label>
              <button
                type="button"
                onClick={() => setShowFlairDropdown(!showFlairDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:border-gray-400 text-sm w-64"
              >
                <Tag className="w-4 h-4 text-gray-400" />
                <span className={`flex-1 text-left ${flair ? 'text-gray-900' : 'text-gray-400'}`}>
                  {flair || 'Select Flair'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showFlairDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setFlair(''); setShowFlairDropdown(false); }}
                    className={`flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-left text-sm ${
                      !flair ? 'bg-blue-50 text-blue-600 font-medium' : ''
                    }`}
                  >
                    None
                  </button>
                  {selectedSub.flairs.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => { setFlair(f); setShowFlairDropdown(false); }}
                      className={`flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-left text-sm ${
                        flair === f ? 'bg-blue-50 text-blue-600 font-medium' : ''
                      }`}
                    >
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{f}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content based on type */}
          {postType === 'text' && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Text (optional)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 min-h-[160px] text-sm"
            />
          )}

          {postType === 'link' && (
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL"
              className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
            />
          )}

          {postType === 'image' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-2">Drag and drop images or</p>
              <button type="button" className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600">
                Upload
              </button>
              <p className="text-xs text-gray-400 mt-2">Image upload is not available yet.</p>
            </div>
          )}

          {postType === 'poll' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Option 1"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Option 2"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              />
              <button type="button" className="text-sm text-blue-500 font-semibold hover:underline">
                + Add Option
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-1.5 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedSubIsArchived}
              className={`px-6 py-1.5 text-white rounded-full text-sm font-semibold ${
                selectedSubIsArchived
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Guidelines */}
      <div className="mt-4 bg-white border border-gray-300 rounded p-4">
        <h2 className="font-bold text-sm mb-2">Posting to r/{selectedSubreddit}</h2>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Remember the human</li>
          <li>Behave like you would in real life</li>
          <li>Look for the original source of content</li>
          <li>Search for duplicates before posting</li>
          <li>Read the community&apos;s rules</li>
        </ol>
      </div>
    </div>
  );
}

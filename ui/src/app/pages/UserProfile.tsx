import { useParams, Link } from 'react-router';
import { posts, comments, formatNumber } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MessageSquare, FileText, Award, Settings, ArrowUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [dbUser, setDbUser] = useState<any>(null);

  useEffect(() => {
    if (username) {
      fetch(`http://localhost:8081/api/users/${username}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then((data) => setDbUser(data))
        .catch((err) => console.error('Error fetching user profile:', err));
    }
  }, [username]);

  const userPosts = posts.filter((p) => p.author === username);
  const userComments = comments.filter((c) => c.author === username);
  const totalKarma = userPosts.reduce((acc, p) => acc + (p.upvotes - p.downvotes), 0) +
    userComments.reduce((acc, c) => acc + (c.upvotes - c.downvotes), 0);
  const commentKarma = userComments.reduce((acc, c) => acc + (c.upvotes - c.downvotes), 0);
  const postKarma = userPosts.reduce((acc, p) => acc + (p.upvotes - p.downvotes), 0);

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Profile Header */}
      <div className="bg-white border border-gray-300 rounded mb-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500" />
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-3">
            <div className="w-20 h-20 bg-orange-500 rounded-full border-4 border-white flex items-center justify-center text-3xl text-white font-bold shadow-sm">
              {username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 mt-8">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">u/{username}</h1>
                {isOwnProfile && (
                  <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
              {isOwnProfile && (
                <p className="text-sm text-gray-500">{dbUser?.email || currentUser?.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Award className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-lg">{formatNumber(totalKarma)}</span>
              </div>
              <div className="text-xs text-gray-500">Total Karma</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ArrowUp className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-lg">{formatNumber(postKarma)}</span>
              </div>
              <div className="text-xs text-gray-500">Post Karma</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span className="font-bold text-lg">{formatNumber(commentKarma)}</span>
              </div>
              <div className="text-xs text-gray-500">Comment Karma</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="font-bold text-sm">
                  {isOwnProfile && currentUser?.createdAt
                    ? formatDistanceToNow(currentUser.createdAt)
                    : '2 years'}
                </span>
              </div>
              <div className="text-xs text-gray-500">Account Age</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="bg-white border border-gray-300 rounded overflow-hidden">
            <div className="border-b border-gray-200 px-4 flex gap-0">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'posts' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Posts ({userPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'comments' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Comments ({userComments.length})
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="divide-y divide-gray-100">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Link to={`/r/${post.subreddit}`} className="font-bold text-gray-800 hover:underline">
                          r/{post.subreddit}
                        </Link>
                        <span>&#8226;</span>
                        <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
                        {post.flair && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{post.flair}</span>
                        )}
                      </div>
                      <Link to={`/r/${post.subreddit}/comments/${post.id}`}>
                        <h3 className="font-semibold mb-1 hover:text-blue-600 transition-colors">{post.title}</h3>
                      </Link>
                      <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          {formatNumber(post.upvotes - post.downvotes)} points
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {post.commentCount} comments
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No posts yet</p>
                    <p className="text-sm">u/{username} hasn&apos;t posted anything.</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="divide-y divide-gray-100">
                {userComments.length > 0 ? (
                  userComments.map((comment) => {
                    const post = posts.find((p) => p.id === comment.postId);
                    return (
                      <div key={comment.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="text-xs text-gray-500 mb-1">
                          <Link to={`/r/${post?.subreddit}`} className="font-bold text-gray-800 hover:underline">
                            r/{post?.subreddit}
                          </Link>
                          <span> &#8226; </span>
                          <Link to={`/r/${post?.subreddit}/comments/${post?.id}`} className="hover:underline">
                            {post?.title}
                          </Link>
                          <span> &#8226; </span>
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </div>
                        <Link to={`/r/${post?.subreddit}/comments/${post?.id}`}>
                          <p className="text-sm text-gray-800 hover:text-blue-600 transition-colors">
                            {comment.content}
                          </p>
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                          <span className="flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" />
                            {comment.upvotes - comment.downvotes} points
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No comments yet</p>
                    <p className="text-sm">u/{username} hasn&apos;t commented on anything.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="bg-white border border-gray-300 rounded p-4 sticky top-16">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                {username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold">u/{username}</div>
                <div className="text-xs text-gray-500">Redditor</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Karma</span>
                <span className="font-semibold">{formatNumber(totalKarma)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Posts</span>
                <span className="font-semibold">{userPosts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comments</span>
                <span className="font-semibold">{userComments.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
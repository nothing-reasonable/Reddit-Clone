import { useParams, Link } from 'react-router';
import { useState } from 'react';
import { ArrowUp, ArrowDown, Share2, Bookmark, BookmarkCheck, Award, MoreHorizontal, Flag, Lock, Trash2, Pin } from 'lucide-react';
import CommentComponent from '../components/CommentComponent';
import { posts, comments, getAwardEmoji, formatNumber, subreddits } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { toast } from 'sonner';

export default function PostDetail() {
  const { postId, subreddit } = useParams<{ postId: string; subreddit: string }>();
  const { user, isAuthenticated } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [commentText, setCommentText] = useState('');
  const [saved, setSaved] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  const post = posts.find((p) => p.id === postId);
  const postComments = comments.filter((c) => c.postId === postId && !c.parentId);
  const allComments = comments.filter((c) => c.postId === postId);

  const subredditData = subreddits.find((s) => s.name === subreddit);
  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user?.username || ''));

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Post not found</h1>
          <p className="text-gray-600">The post you&apos;re looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const score = post.upvotes - post.downvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const handleVote = (type: 'up' | 'down') => {
    setVote(vote === type ? null : type);
  };

  const handleComment = () => {
    if (!isAuthenticated) { toast.error('Please log in to comment'); return; }
    if (isLocked) { toast.error('This post is locked'); return; }
    if (commentText.trim()) { toast.success('Comment posted!'); setCommentText(''); }
  };

  const handleReply = (commentId: string) => {
    if (isLocked) { toast.error('This post is locked'); return; }
    toast.success('Reply posted!');
  };

  const getReplies = (commentId: string) => {
    return comments.filter((c) => c.parentId === commentId);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Post Card */}
      <div className={`bg-white border border-gray-300 rounded mb-3 ${isRemoved ? 'opacity-50' : ''}`}>
        <div className="flex">
          {/* Vote Section */}
          <div className="flex flex-col items-center bg-gray-50 px-3 py-4 rounded-l gap-0.5">
            <button
              onClick={() => handleVote('up')}
              className={`p-1 rounded hover:bg-orange-100 transition-colors ${
                vote === 'up' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <ArrowUp className="w-6 h-6" fill={vote === 'up' ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-sm font-bold ${vote === 'up' ? 'text-orange-500' : vote === 'down' ? 'text-blue-500' : 'text-gray-900'}`}>
              {formatNumber(score)}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1 rounded hover:bg-blue-100 transition-colors ${
                vote === 'down' ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              <ArrowDown className="w-6 h-6" fill={vote === 'down' ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 min-w-0">
            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 flex-wrap">
              <Link to={`/r/${post.subreddit}`} className="font-bold text-gray-900 hover:underline">
                r/{post.subreddit}
              </Link>
              <span>&#8226;</span>
              <span>Posted by</span>
              <Link to={`/user/${post.author}`} className="hover:underline">
                u/{post.author}
              </Link>
              <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
              {post.flagged && (
                <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                  <Flag className="w-3 h-3" /> FLAGGED
                </span>
              )}
              {isLocked && <span className="text-yellow-600 font-semibold">🔒 LOCKED</span>}
              {isPinned && <span className="text-green-600 font-semibold">📌 PINNED</span>}
              {isRemoved && <span className="text-red-600 font-semibold">🗑️ REMOVED</span>}
            </div>

            <h1 className="text-xl font-bold mb-2">{post.title}</h1>

            {/* Flair + Awards */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.flair && (
                <span className="inline-block px-2.5 py-0.5 bg-gray-200 text-xs rounded-full font-medium">
                  {post.flair}
                </span>
              )}
              {post.awards && post.awards.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {post.awards.map((award, idx) => (
                    <span key={idx} className="flex items-center gap-0.5 text-xs bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full">
                      <span>{getAwardEmoji(award.type)}</span>
                      {award.count > 1 && <span className="text-gray-600">{award.count}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-800 mb-4 whitespace-pre-line leading-relaxed">{post.content}</div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 -ml-1.5 flex-wrap">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => { setSaved(!saved); toast.success(saved ? 'Unsaved' : 'Saved!'); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs font-semibold ${saved ? 'text-yellow-600' : 'text-gray-500'}`}
              >
                {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => toast.success('Awarded! 🏅')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <Award className="w-4 h-4" />
                Award
              </button>

              {/* Mod Actions */}
              {isModerator && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowModMenu(!showModMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-green-50 rounded text-xs text-green-700 font-semibold border border-green-200"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    Mod
                  </button>
                  {showModMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setIsRemoved(!isRemoved);
                          toast.success(isRemoved ? 'Post restored' : 'Post removed');
                          setShowModMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        {isRemoved ? 'Restore' : 'Remove Post'}
                      </button>
                      <button
                        onClick={() => {
                          setIsLocked(!isLocked);
                          toast.success(isLocked ? 'Post unlocked' : 'Post locked');
                          setShowModMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <Lock className="w-4 h-4 text-yellow-600" />
                        {isLocked ? 'Unlock' : 'Lock Post'}
                      </button>
                      <button
                        onClick={() => {
                          setIsPinned(!isPinned);
                          toast.success(isPinned ? 'Post unpinned' : 'Post pinned');
                          setShowModMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <Pin className="w-4 h-4 text-green-600" />
                        {isPinned ? 'Unpin' : 'Pin Post'}
                      </button>
                      <button
                        onClick={() => {
                          toast.success('Post flagged for review');
                          setShowModMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <Flag className="w-4 h-4 text-red-500" />
                        Flag Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Locked Notice */}
      {isLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3 flex items-center gap-2 text-sm text-yellow-800">
          <Lock className="w-4 h-4" />
          This post has been locked by moderators. New comments are not allowed.
        </div>
      )}

      {/* Comment Box */}
      {!isLocked && (
        <div className="bg-white border border-gray-300 rounded p-4 mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Comment as{' '}
            <span className="text-blue-500 font-medium">
              {isAuthenticated ? `u/${user?.username}` : 'Guest'}
            </span>
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={isAuthenticated ? 'What are your thoughts?' : 'Please log in to comment'}
            disabled={!isAuthenticated}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 min-h-[80px] disabled:bg-gray-50 text-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleComment}
              disabled={!isAuthenticated || !commentText.trim()}
              className="px-5 py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white border border-gray-300 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">
            {allComments.length} {allComments.length === 1 ? 'Comment' : 'Comments'}
          </h2>
          <select className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none">
            <option>Best</option>
            <option>Top</option>
            <option>New</option>
            <option>Controversial</option>
          </select>
        </div>
        <div className="space-y-3">
          {postComments.length > 0 ? (
            postComments.map((comment) => (
              <CommentComponent
                key={comment.id}
                comment={comment}
                replies={getReplies(comment.id)}
                onReply={handleReply}
                isModerator={isModerator}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-8 text-sm">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
}

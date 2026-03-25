import { useParams, Link, useNavigate } from 'react-router';
import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Share2, Bookmark, BookmarkCheck, Award, MoreHorizontal, Flag, Lock, Trash2, Pin } from 'lucide-react';
import { formatNumber } from '../utils/format';
import { getAwardEmoji } from '../utils/awards';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { toast } from 'sonner';
import { deletePost, getPostById, votePost } from '../services/contentApi';
import { getSubredditByName } from '../services/subredditApi';
import type { Post } from '../types/domain';
import CommentComponent, { CommentNode } from '../components/CommentComponent';
import { getComments, createComment, deleteComment } from '../services/commentApi';

export default function PostDetail() {
  const { postId, subreddit } = useParams<{ postId: string; subreddit: string }>();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendModerators, setBackendModerators] = useState<string[]>([]);
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(0);
  const [score, setScore] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [saved, setSaved] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);
  const [showCreatorMenu, setShowCreatorMenu] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!postId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const [loadedPost, loadedComments] = await Promise.all([
          getPostById(postId),
          getComments(postId),
        ]);

        if (cancelled) return;
        setPost(loadedPost);

        if (subreddit) {
          try {
            const loadedSubreddit = await getSubredditByName(subreddit);
            if (!cancelled) {
              setBackendModerators(loadedSubreddit?.moderators ?? []);
            }
          } catch {
            if (!cancelled) {
              // Do not block post rendering when subreddit metadata is temporarily unavailable.
              setBackendModerators([]);
            }
          }
        } else {
          setBackendModerators([]);
        }

        if (loadedPost) {
          setIsLocked(loadedPost.locked ?? false);
          setIsPinned(loadedPost.pinned ?? false);
          setIsRemoved(loadedPost.removed ?? false);
          setScore(loadedPost.upvotes - loadedPost.downvotes);
          setUserVote(user?.username === loadedPost.author ? 1 : 0);
        }

        const buildTree = (flat: any[]): CommentNode[] => {
          const map = new Map<string, CommentNode>();
          const roots: CommentNode[] = [];

          flat.forEach((c) => {
            map.set(c.id, { ...c, replies: [] });
          });

          flat.forEach((c) => {
            if (c.parentId && map.has(c.parentId)) {
              map.get(c.parentId)!.replies.push(map.get(c.id)!);
            } else {
              roots.push(map.get(c.id)!);
            }
          });
          return roots;
        };

        setComments(buildTree(loadedComments));
      } catch {
        if (!cancelled) {
          setPost(null);
          setBackendModerators([]);
          setComments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [postId, subreddit, user?.username]);

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    backendModerators.some((moderator) => moderator === (user?.username || ''));

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Loading post...</h1>
        </div>
      </div>
    );
  }

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

  const canDeletePost = !!user && user.username === post.author && post.author !== '[deleted]';

  const handleVote = async (type: 'up' | 'down') => {
    if (!token || !postId) {
      toast.error('Please log in to vote');
      return;
    }

    const intendedDirection: -1 | 1 = type === 'up' ? 1 : -1;
    const nextDirection: -1 | 0 | 1 = userVote === intendedDirection ? 0 : intendedDirection;

    try {
      const newScore = await votePost(token, postId, nextDirection);
      setScore(newScore);
      setUserVote(nextDirection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handleComment = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to comment');
      return;
    }
    if (isLocked) {
      toast.error('This post is locked');
      return;
    }
    if (!commentText.trim() || !postId) return;
    try {
      const newComment = await createComment(token || '', postId, commentText);
      setComments([{ ...newComment, replies: [] } as unknown as CommentNode, ...comments]);
      setCommentText('');
      toast.success('Comment posted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to post comment');
    }
  };

  const handleReply = async (parentId: string, replyContent: string) => {
    if (!user || !postId) return;
    try {
      const newComment = await createComment(token || '', postId, replyContent, parentId);

      const insertReply = (nodes: CommentNode[]): CommentNode[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return { ...node, replies: [...node.replies, { ...newComment, replies: [] } as unknown as CommentNode] };
          }
          if (node.replies.length > 0) {
            return { ...node, replies: insertReply(node.replies) };
          }
          return node;
        });
      };

      setComments(insertReply(comments));
      toast.success('Reply posted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to post reply');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token || !postId) return;
    try {
      await deleteComment(token, postId, commentId);

      const markDeleted = (nodes: CommentNode[]): CommentNode[] => {
        return nodes.map((node) => {
          if (node.id === commentId) {
            return { ...node, removed: true, content: '[deleted]', author: '[deleted]' };
          }
          if (node.replies.length > 0) {
            return { ...node, replies: markDeleted(node.replies) };
          }
          return node;
        });
      };

      setComments(markDeleted(comments));
      toast.success('Comment deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete comment');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleDeletePost = async () => {
    if (!token || !postId || !subreddit || !canDeletePost) return;
    if (!window.confirm('Delete this post?')) return;

    try {
      await deletePost(token, postId);
      toast.success('Post deleted');
      navigate(`/r/${subreddit}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setShowCreatorMenu(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className={`bg-white border border-gray-300 rounded mb-3 ${isRemoved ? 'opacity-50' : ''}`}>
        <div className="flex">
          <div className="flex flex-col items-center bg-gray-50 px-3 py-4 rounded-l gap-0.5">
            <button
              onClick={() => handleVote('up')}
              className={`p-1 rounded hover:bg-orange-100 transition-colors ${userVote === 1 ? 'text-orange-500' : 'text-gray-400'}`}
            >
              <ArrowUp className="w-6 h-6" fill={userVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-sm font-bold ${userVote === 1 ? 'text-orange-500' : userVote === -1 ? 'text-blue-500' : 'text-gray-900'}`}>
              {formatNumber(score)}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1 rounded hover:bg-blue-100 transition-colors ${userVote === -1 ? 'text-blue-500' : 'text-gray-400'}`}
            >
              <ArrowDown className="w-6 h-6" fill={userVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex-1 p-4 min-w-0 relative">
            {canDeletePost && (
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => setShowCreatorMenu((prev) => !prev)}
                  className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Post actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showCreatorMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button
                      onClick={handleDeletePost}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}

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

            <div className="flex items-center gap-1 -ml-1.5 flex-wrap">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => {
                  setSaved(!saved);
                  toast.success(saved ? 'Unsaved' : 'Saved!');
                }}
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

      {isLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3 flex items-center gap-2 text-sm text-yellow-800">
          <Lock className="w-4 h-4" />
          This post has been locked by moderators. New comments are not allowed.
        </div>
      )}

      {!isLocked && (
        <div className="bg-white border border-gray-300 rounded p-4 mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Comment as <span className="text-blue-500 font-medium">{isAuthenticated ? `u/${user?.username}` : 'Guest'}</span>
          </p>
          <textarea
            value={commentText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
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

      <div className="bg-white border border-gray-300 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">Comments ({post.commentCount || 0})</h2>
          <select className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none">
            <option>Best</option>
            <option>Top</option>
            <option>New</option>
          </select>
        </div>
        <div className="space-y-1">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            comments.map((node: CommentNode) => (
              <CommentComponent key={node.id} node={node} onReply={handleReply} onDelete={handleDeleteComment} isModerator={isModerator} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

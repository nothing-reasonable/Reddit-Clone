import { Link, useNavigate } from 'react-router';
import { ArrowUp, ArrowDown, MessageSquare, Share2, Bookmark, Flag, Award, BookmarkCheck, X, Copy, ExternalLink, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { getAwardEmoji } from '../utils/awards';
import { formatNumber } from '../utils/format';
import type { Post } from '../types/domain';
import { useEffect, useState, type MouseEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { deletePost, reportPost, votePost } from '../services/contentApi';

const AWARDS_LIST = [
  { type: 'gold', emoji: '🥇', name: 'Gold', cost: 500, description: 'For outstanding content' },
  { type: 'silver', emoji: '🥈', name: 'Silver', cost: 100, description: 'A modest award' },
  { type: 'helpful', emoji: '🤝', name: 'Helpful', cost: 150, description: 'For helpful contributions' },
  { type: 'wholesome', emoji: '💕', name: 'Wholesome', cost: 125, description: 'Pure and wholesome' },
  { type: 'rocket', emoji: '🚀', name: 'Rocket Like', cost: 200, description: 'To the moon!' },
  { type: 'bravo', emoji: '👏', name: 'Bravo!', cost: 175, description: 'Well done!' },
  { type: 'mindblown', emoji: '🤯', name: 'Mind Blown', cost: 250, description: 'Absolutely incredible' },
  { type: 'laughing', emoji: '😂', name: 'Take My Laugh', cost: 75, description: 'Made me LOL' },
];

const SHARE_OPTIONS = [
  { id: 'copy', label: 'Copy Link', icon: Copy, color: 'text-gray-700' },
  { id: 'twitter', label: 'Twitter / X', icon: ExternalLink, color: 'text-sky-500' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
  { id: 'facebook', label: 'Facebook', icon: ExternalLink, color: 'text-blue-600' },
  { id: 'email', label: 'Email', icon: ExternalLink, color: 'text-gray-600' },
];

interface PostCardProps {
  post: Post;
  showSubreddit?: boolean;
}

export default function PostCard({ post, showSubreddit = true }: PostCardProps) {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const reportedKey = user ? `reportedPosts_${user.username}` : null;

  const wasReportedByUser = reportedKey
    ? (JSON.parse(localStorage.getItem(reportedKey) ?? '[]') as string[]).includes(post.id)
    : false;
  const [hasReported, setHasReported] = useState(wasReportedByUser);
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(0);
  const [score, setScore] = useState(post.upvotes - post.downvotes);
  const [isDeleted, setIsDeleted] = useState(post.deleted ?? false);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreatorMenu, setShowCreatorMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  useEffect(() => {
    setScore(post.upvotes - post.downvotes);
    setIsDeleted(post.deleted ?? false);
    setUserVote(user?.username === post.author ? 1 : 0);
  }, [post, user?.username]);

  const postUrl = `${window.location.origin}/r/${post.subreddit}/comments/${post.id}`;
  const canDeletePost = !!user && user.username === post.author && !isDeleted;

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a,button,input,textarea,select,label,[role="button"]')) {
      return;
    }
    navigate(`/r/${post.subreddit}/comments/${post.id}`);
  };

  const handleVote = async (type: 'up' | 'down', e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      toast.error('Please log in to vote');
      return;
    }

    const intendedDirection: -1 | 1 = type === 'up' ? 1 : -1;
    const nextDirection: -1 | 0 | 1 = userVote === intendedDirection ? 0 : intendedDirection;

    setIsVoting(true);
    try {
      const newScore = await votePost(token, post.id, nextDirection);
      setScore(newScore);
      setUserVote(nextDirection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setIsVoting(false);
    }
  };

  const handleDeletePost = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token || !canDeletePost) {
      return;
    }
    if (!window.confirm('Delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(token, post.id);
      setIsDeleted(true);
      setShowCreatorMenu(false);
      toast.success('Post deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(!saved);
    toast.success(saved ? 'Unsaved' : 'Saved!');
  };

  const handleShare = (optionId: string) => {
    switch (optionId) {
      case 'copy':
        navigator.clipboard?.writeText(postUrl);
        toast.success('Link copied to clipboard!');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + postUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(postUrl)}`, '_blank');
        break;
    }
    setShowShareModal(false);
  };

  const handleAward = (awardType: string) => {
    const award = AWARDS_LIST.find((a) => a.type === awardType);
    toast.success(`${award?.emoji} ${award?.name} award given!`);
    setShowAwardModal(false);
  };

  const handleReport = async () => {
    if (!reportReason) { toast.error('Please select a reason'); return; }
    if (!token) { toast.error('Please log in to report'); return; }
    try {
      await reportPost(token, post.id);
      if (reportedKey) {
        const reported = JSON.parse(localStorage.getItem(reportedKey) ?? '[]') as string[];
        localStorage.setItem(reportedKey, JSON.stringify([...reported, post.id]));
      }
      setHasReported(true);
      toast.success('Report submitted. Thank you!');
      setShowReportModal(false);
      setReportReason('');
    } catch {
      toast.error('Failed to submit report. Please try again.');
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-white border border-gray-300 rounded hover:border-gray-400 transition-colors cursor-pointer ${post.removed ? 'opacity-50' : ''}`}
      >
        <div className="flex">
          {/* Vote Section */}
          <div className="flex flex-col items-center bg-gray-50 px-2 py-2 rounded-l gap-0.5">
            <button
              onClick={(e) => handleVote('up', e)}
                disabled={isVoting}
              className={`p-1 rounded hover:bg-orange-100 transition-colors ${
                userVote === 1 ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
              }`}
            >
              <ArrowUp className="w-5 h-5" fill={userVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-xs font-bold ${userVote === 1 ? 'text-orange-500' : userVote === -1 ? 'text-blue-500' : 'text-gray-900'}`}>
              {formatNumber(score)}
            </span>
            <button
              onClick={(e) => handleVote('down', e)}
              disabled={isVoting}
              className={`p-1 rounded hover:bg-blue-100 transition-colors ${
                userVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
              }`}
            >
              <ArrowDown className="w-5 h-5" fill={userVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-2 pt-1.5 min-w-0 relative">
            {canDeletePost && (
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreatorMenu((prev) => !prev);
                  }}
                  className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Post actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showCreatorMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {isDeleting ? 'Deleting...' : 'Delete Post'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 flex-wrap">
              {showSubreddit && (
                <Link to={`/r/${post.subreddit}`} className="font-bold text-gray-900 hover:underline">
                  r/{post.subreddit}
                </Link>
              )}
              {showSubreddit && <span>&#8226;</span>}
              <span>Posted by</span>
              <Link to={`/user/${isDeleted ? '[deleted]' : post.author}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                u/{isDeleted ? '[deleted]' : post.author}
              </Link>
              <span>{formatDistanceToNow(post.createdAt, { addSuffix: true })}</span>
              {post.locked && (
                <span className="text-yellow-600 font-semibold">🔒 LOCKED</span>
              )}
              {post.pinned && (
                <span className="text-green-600 font-semibold">📌 PINNED</span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-base font-semibold mb-1 hover:text-blue-600 leading-snug">
              {isDeleted ? '[deleted]' : post.title}
            </h2>

            {/* Flair + Awards */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {post.flair && (
                <span className="inline-block px-2 py-0.5 bg-gray-200 text-xs rounded-full">
                  {post.flair}
                </span>
              )}
              {post.awards && post.awards.length > 0 && (
                <div className="flex items-center gap-1">
                  {post.awards.map((award, idx) => (
                    <span key={idx} className="flex items-center gap-0.5 text-xs">
                      <span>{getAwardEmoji(award.type)}</span>
                      {award.count > 1 && <span className="text-gray-500">{award.count}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content Preview */}
            <p className="text-sm text-gray-700 mb-2 line-clamp-3 leading-relaxed">{isDeleted ? '[deleted]' : post.content}</p>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 -ml-1.5 flex-wrap">
              <Link
                to={`/r/${post.subreddit}/comments/${post.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{post.commentCount} Comments</span>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(true); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs font-semibold ${
                  saved ? 'text-yellow-600' : 'text-gray-500'
                }`}
              >
                {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAwardModal(true); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-500 font-semibold"
              >
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Award</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (hasReported) {

                    toast.warning('You have already reported this post.');
                  } else {
                    setShowReportModal(true);
                  }
                }}

                className={`flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded text-xs font-semibold ${hasReported ? 'text-red-400 cursor-default' : 'text-gray-500'}`}
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">{hasReported ? 'Reported' : 'Report'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">Share Post</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {SHARE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleShare(opt.id)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center ${opt.color}`}>
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                <input
                  type="text"
                  value={postUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-gray-600 outline-none truncate"
                />
                <button
                  onClick={() => handleShare('copy')}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold hover:bg-blue-600 shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Award Modal */}
      {showAwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAwardModal(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">Give Award</h3>
              <button onClick={() => setShowAwardModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">Select an award for this post</p>
              <div className="grid grid-cols-2 gap-2">
                {AWARDS_LIST.map((award) => (
                  <button
                    key={award.type}
                    onClick={() => handleAward(award.type)}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{award.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{award.name}</div>
                      <div className="text-[10px] text-gray-400">{award.cost} coins</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">You have <span className="font-semibold text-orange-500">1,250 coins</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">Report Post</h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {['Spam', 'Harassment', 'Hate speech', 'Misinformation', 'Breaks community rules', 'Other'].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                    reportReason === reason ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-red-500"
                  />
                  <span className="text-sm">{reason}</span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReport} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

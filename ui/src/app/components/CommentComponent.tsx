import { ArrowUp, ArrowDown, MessageSquare, Flag, Trash2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { reportComment, voteComment } from '../services/commentApi';
import { useAuth } from '../contexts/AuthContext';

export type CommentNode = {
  id: string;
  postId: string;
  parentId?: string;
  author: string;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  removed: boolean;
  flagged: boolean;
  replies: CommentNode[];
  reportReasons?: string[];
  reports?: number;
};

interface CommentComponentProps {
  key?: string;
  node: CommentNode;
  onReply?: (parentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  isModerator?: boolean;
}

export default function CommentComponent({ node, onReply, onDelete, isModerator: _isModerator }: CommentComponentProps) {
  const { user, token } = useAuth();
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(user?.username === node.author ? 1 : 0);
  const [score, setScore] = useState(node.upvotes - node.downvotes);
  const [isVoting, setIsVoting] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const [isReporting, setIsReporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showCommentMenu, setShowCommentMenu] = useState(false);
  const reportedCommentsKey = user ? `reportedComments_${user.username}` : null;
  const wasReportedByUser = reportedCommentsKey
    ? (JSON.parse(localStorage.getItem(reportedCommentsKey) ?? '[]') as string[]).includes(node.id)
    : false;
  const [hasReported, setHasReported] = useState(wasReportedByUser);

  const canDeleteComment = !!user && user.username === node.author;

  const handleVote = async (type: 'up' | 'down') => {
    if (!token) {
      toast.error('Please log in to vote');
      return;
    }

    const intendedDirection: -1 | 1 = type === 'up' ? 1 : -1;
    const nextDirection: -1 | 0 | 1 = userVote === intendedDirection ? 0 : intendedDirection;

    setIsVoting(true);
    try {
      const newScore = await voteComment(token, node.postId, node.id, nextDirection);
      setScore(newScore);
      setUserVote(nextDirection);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to vote on comment');
    } finally {
      setIsVoting(false);
    }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    setIsReplying(true);
    try {
      await onReply(node.id, replyText);
      setReplyText('');
      setShowReplyBox(false);
      setCollapsed(false); // Auto-expand to show new reply
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this comment?')) return;
    setIsDeleting(true);
    try {
      await onDelete(node.id);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleReport = () => {
    setShowReportModal(true);
  };

  const getReportReasonsDisplay = (): string => {
    if (node.reportReasons) {
      try {
        const reasons = JSON.parse(node.reportReasons) as string[];
        if (Array.isArray(reasons) && reasons.length > 0) {
          // Count frequency of each reason and sort descending
          const freq: Record<string, number> = {};
          for (const r of reasons) {
            freq[r] = (freq[r] || 0) + 1;
          }
          const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
          return sorted.map(([reason, count]) => count > 1 ? `${reason} (${count})` : reason).join(', ');
        }
      } catch {
        return 'User reported';
      }
    }
    if (node.reports && node.reports > 0) {
      return 'User reported';
    }
    return 'Flagged by AutoMod';
  };

  const handleReportSubmit = async () => {
    if (!reportReason) {
      toast.error('Please select a reason');
      return;
    }
    setIsReporting(true);
    try {
      await reportComment(node.postId, node.id, reportReason);
      setHasReported(true);
      if (reportedCommentsKey) {
        const reported = JSON.parse(localStorage.getItem(reportedCommentsKey) ?? '[]') as string[];
        localStorage.setItem(reportedCommentsKey, JSON.stringify([...reported, node.id]));
      }
      toast.success('Comment reported successfully');
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to report comment');
    } finally {
      setIsReporting(false);
    }
  };

  if (node.removed) {
    return (
      <div className="border-l-2 border-gray-200 pl-4 mb-3">
        <p className="text-xs text-red-500 italic">[Comment removed by moderator/user]</p>
        
        {/* Render child replies even if parent is deleted to keep thread intact */}
        {!collapsed && node.replies && node.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {node.replies.map((childNode) => (
              <CommentComponent 
                key={childNode.id} 
                node={childNode} 
                onReply={onReply}
                onDelete={onDelete}
                isModerator={_isModerator}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-gray-200 pl-3 mb-3 group/comment relative">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-0.5 mt-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-blue-200 hover:text-blue-700 transition-colors"
          >
            {node.author.charAt(0).toUpperCase()}
          </button>
          {!collapsed && (
            <>
              <button
                onClick={() => handleVote('up')}
                disabled={isVoting}
                className={`p-0.5 rounded hover:bg-orange-100 ${userVote === 1 ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleVote('down')}
                disabled={isVoting}
                className={`p-0.5 rounded hover:bg-blue-100 ${userVote === -1 ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link to={`/u/${node.author}`} className="font-bold text-gray-900 hover:underline">
              {node.author}
            </Link>
            {node.flagged && (
              <span className="bg-yellow-100 text-yellow-800 px-1.5 rounded flex items-center gap-1 font-medium">
                <Flag className="w-3 h-3" /> Flagged
              </span>
            )}
            <span>•</span>
            <span title={node.createdAt.toLocaleString()}>
              {formatDistanceToNow(node.createdAt, { addSuffix: true })}
            </span>
            {canDeleteComment && onDelete && (
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowCommentMenu((prev) => !prev)}
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Comment actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showCommentMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={async () => {
                        await handleDelete();
                        setShowCommentMenu(false);
                      }}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {isDeleting ? 'Deleting...' : 'Delete Comment'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="text-sm mt-1 whitespace-pre-wrap break-words">{node.content}</div>
              
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs font-medium text-gray-700">
                  {score > 0 ? '+' : ''}{score} vote{score !== 1 ? 's' : ''}
                </span>

                <div className="opacity-0 group-hover/comment:opacity-100 flex items-center flex-wrap gap-2 transition-opacity">
                  <button 
                    onClick={() => setShowReplyBox(!showReplyBox)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium"
                    disabled={isReplying}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Reply
                  </button>


                  <button
                    onClick={handleReport}
                    className={`flex items-center gap-1 text-xs font-medium ml-1 ${
                      hasReported
                        ? 'text-red-500 cursor-not-allowed'
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                    disabled={hasReported}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {hasReported ? 'Reported' : 'Report'}
                  </button>
                  
                  {(_isModerator || node.author === "moderator") && onDelete && (
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 font-medium ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {showReplyBox && (
                <div className="mt-3 pr-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 min-h-[80px] text-sm"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setShowReplyBox(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-full"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitReply}
                      disabled={!replyText.trim() || isReplying}
                      className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs font-semibold hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {isReplying ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Recursive Replies Rendering */}
              {node.replies && node.replies.length > 0 && (
                <div className="mt-3 space-y-3">
                  {node.replies.map((childNode) => (
                    <CommentComponent 
                      key={childNode.id} 
                      node={childNode} 
                      onReply={onReply}
                      onDelete={onDelete}
                      isModerator={_isModerator}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

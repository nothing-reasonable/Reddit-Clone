import { ArrowUp, ArrowDown, MessageSquare, Flag, MoreHorizontal, Trash2, Shield } from 'lucide-react';
import { Comment } from '../data/mockData';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CommentComponentProps {
  comment: Comment;
  replies?: Comment[];
  onReply?: (commentId: string) => void;
  isModerator?: boolean;
}

export default function CommentComponent({ comment, replies, onReply, isModerator }: CommentComponentProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);

  const score = comment.upvotes - comment.downvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const handleVote = (type: 'up' | 'down') => {
    setVote(vote === type ? null : type);
  };

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id);
      setReplyText('');
      setShowReplyBox(false);
    }
  };

  if (removed) {
    return (
      <div className="border-l-2 border-gray-200 pl-4 mb-3">
        <p className="text-xs text-red-500 italic">[Comment removed by moderator]</p>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-gray-200 pl-3 mb-3 group/comment">
      <div className="flex items-start gap-2">
        {/* Collapse Toggle + Votes */}
        <div className="flex flex-col items-center gap-0.5 mt-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-blue-200 hover:text-blue-700 transition-colors"
          >
            {comment.author.charAt(0).toUpperCase()}
          </button>
          {!collapsed && (
            <>
              <button
                onClick={() => handleVote('up')}
                className={`p-0.5 rounded hover:bg-orange-100 ${vote === 'up' ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
              >
                <ArrowUp className="w-3.5 h-3.5" fill={vote === 'up' ? 'currentColor' : 'none'} />
              </button>
              <span className={`text-[10px] font-bold ${vote === 'up' ? 'text-orange-500' : vote === 'down' ? 'text-blue-500' : 'text-gray-500'}`}>
                {score}
              </span>
              <button
                onClick={() => handleVote('down')}
                className={`p-0.5 rounded hover:bg-blue-100 ${vote === 'down' ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
              >
                <ArrowDown className="w-3.5 h-3.5" fill={vote === 'down' ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
            <Link to={`/user/${comment.author}`} className="font-semibold text-gray-800 hover:underline">
              {comment.author}
            </Link>
            <span>&#8226;</span>
            <span>{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
            {comment.flagged && (
              <span className="flex items-center gap-0.5 text-red-500 font-semibold text-[10px]">
                <Flag className="w-2.5 h-2.5" /> FLAGGED
              </span>
            )}
          </div>

          {!collapsed && (
            <>
              {/* Content */}
              <p className="text-sm mb-1.5 leading-relaxed">{comment.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setShowReplyBox(!showReplyBox)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-semibold"
                >
                  <MessageSquare className="w-3 h-3" />
                  Reply
                </button>
                <button
                  onClick={() => toast.success('Link copied!')}
                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Share
                </button>
                <button
                  onClick={() => toast.success('Reported')}
                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Report
                </button>

                {isModerator && (
                  <div className="relative ml-1">
                    <button
                      onClick={() => setShowModMenu(!showModMenu)}
                      className="flex items-center gap-0.5 text-xs text-green-700 hover:bg-green-50 rounded px-1.5 py-0.5"
                    >
                      <Shield className="w-3 h-3" />
                      Mod
                    </button>
                    {showModMenu && (
                      <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          onClick={() => {
                            setRemoved(true);
                            toast.success('Comment removed');
                            setShowModMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-full text-left text-xs"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          Remove
                        </button>
                        <button
                          onClick={() => {
                            toast.success('Comment flagged');
                            setShowModMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-full text-left text-xs"
                        >
                          <Flag className="w-3 h-3 text-orange-500" />
                          Flag
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reply Box */}
              {showReplyBox && (
                <div className="mt-2 mb-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleReply}
                      className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold hover:bg-blue-600"
                    >
                      Comment
                    </button>
                    <button
                      onClick={() => setShowReplyBox(false)}
                      className="px-3 py-1 text-gray-600 text-xs hover:bg-gray-100 rounded-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Nested Replies */}
              {replies && replies.length > 0 && (
                <div className="mt-2">
                  {replies.map((reply) => (
                    <CommentComponent key={reply.id} comment={reply} onReply={onReply} isModerator={isModerator} />
                  ))}
                </div>
              )}
            </>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-blue-500 hover:underline"
            >
              Show more ({(replies?.length || 0) + 1} {(replies?.length || 0) === 0 ? 'reply' : 'replies'})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

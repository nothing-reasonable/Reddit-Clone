import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import type { ModMail, Subreddit } from '../types/domain';
import { Mail, ArrowLeft, Send, Circle, CheckCircle2, Plus, X, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type MailFilter = 'all' | 'unread' | 'read' | 'appeals' | 'reports';

export default function ModMailPage() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [mails, setMails] = useState<ModMail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeFilter, setActiveFilter] = useState<MailFilter>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');

  useEffect(() => {
    if (!subreddit) return;

    setIsLoading(true);
    getSubredditByName(subreddit)
      .then((record) => setSubredditData(record))
      .catch(() => setSubredditData(null))
      .finally(() => setIsLoading(false));
  }, [subreddit]);

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading mod mail...</div>
      </div>
    );
  }

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

  const selected = mails.find((m) => m.id === selectedMail);

  // Filter mails
  const filteredMails = mails.filter((m) => {
    switch (activeFilter) {
      case 'unread': return !m.read;
      case 'read': return m.read;
      case 'appeals': return m.subject.toLowerCase().includes('removed') || m.subject.toLowerCase().includes('unfairly') || m.subject.toLowerCase().includes('appeal');
      case 'reports': return m.subject.toLowerCase().includes('report') || m.subject.toLowerCase().includes('harass');
      default: return true;
    }
  });

  const handleMarkRead = (id: string) => {
    setMails(mails.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedMail) return;
    setMails(mails.map((m) =>
      m.id === selectedMail
        ? {
            ...m,
            read: true,
            replies: [...m.replies, { from: user!.username, content: replyText, timestamp: new Date() }],
          }
        : m
    ));
    setReplyText('');
    toast.success('Reply sent');
  };

  const handleComposeSend = () => {
    if (!composeRecipient.trim() || !composeSubject.trim() || !composeContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    const newMail = {
      id: 'mm-' + Math.random().toString(36).substr(2, 9),
      subreddit: subreddit!,
      from: composeRecipient,
      subject: composeSubject,
      content: composeContent,
      timestamp: new Date(),
      read: true,
      replies: [{ from: user!.username, content: composeContent, timestamp: new Date() }],
    };
    setMails([newMail, ...mails]);
    setShowCompose(false);
    setComposeRecipient('');
    setComposeSubject('');
    setComposeContent('');
    setSelectedMail(newMail.id);
    toast.success('Message sent');
  };

  const filters: { id: MailFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: mails.length },
    { id: 'unread', label: 'Unread', count: mails.filter((m) => !m.read).length },
    { id: 'read', label: 'Read', count: mails.filter((m) => m.read).length },
    { id: 'appeals', label: 'Appeals' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3">
          <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-500" />
              Mod Mail
            </h1>
            <p className="text-gray-600">
              r/{subreddit} - {mails.filter((m) => !m.read).length} unread
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-4">
          <Filter className="w-4 h-4 text-gray-400" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFilter === f.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`ml-1 ${activeFilter === f.id ? 'opacity-80' : 'text-gray-400'}`}>
                  ({f.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-16rem)] relative">
        {/* Mail List */}
        <div className="w-96 bg-white border border-gray-300 rounded overflow-y-auto shrink-0">
          {filteredMails.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages match this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMails.map((mail) => (
                <button
                  key={mail.id}
                  onClick={() => { setSelectedMail(mail.id); handleMarkRead(mail.id); }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedMail === mail.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  } ${!mail.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!mail.read ? (
                      <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500 mt-2 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5 text-gray-300 mt-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${!mail.read ? 'font-bold' : 'font-medium'}`}>
                          u/{mail.from}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(mail.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <div className={`text-sm ${!mail.read ? 'font-semibold' : ''} truncate`}>
                        {mail.subject}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {mail.content}
                      </div>
                      {mail.replies.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {mail.replies.length} repl{mail.replies.length === 1 ? 'y' : 'ies'}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mail Detail */}
        <div className="flex-1 bg-white border border-gray-300 rounded overflow-y-auto">
          {selected ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-gray-300">
                <h2 className="font-bold text-lg">{selected.subject}</h2>
                <div className="text-sm text-gray-600 mt-1">
                  From <Link to={`/user/${selected.from}`} className="text-blue-500 hover:underline">u/{selected.from}</Link>
                  {' \u2022 '}
                  {formatDistanceToNow(selected.timestamp, { addSuffix: true })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Original Message - User style */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">{selected.from.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">u/{selected.from}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">User</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(selected.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm border-l-4 border-gray-300">
                      {selected.content}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {selected.replies.map((reply, idx) => {
                  const isMod = subredditData?.moderators.includes(reply.from);
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isMod ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        <span className={`text-sm font-semibold ${isMod ? 'text-white' : ''}`}>
                          {reply.from.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">u/{reply.from}</span>
                          {isMod && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">MOD</span>
                          )}
                          {!isMod && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">User</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(reply.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <div className={`rounded-lg p-3 text-sm ${
                          isMod
                            ? 'bg-green-50 border border-green-200 border-l-4 border-l-green-500'
                            : 'bg-gray-50 border-l-4 border-gray-300'
                        }`}>
                          {reply.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="border-t border-gray-300 p-4">
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">{user!.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply as moderator..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Compose Button */}
        <button
          onClick={() => setShowCompose(true)}
          className="absolute bottom-4 right-4 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 flex items-center justify-center transition-transform hover:scale-105"
          title="Compose New Message"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-green-50">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Compose New Message
              </h2>
              <button onClick={() => setShowCompose(false)} className="p-1 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">To (username)</label>
                <input
                  type="text"
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  placeholder="e.g. username123"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Message subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  placeholder="Write your message..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                Sending as moderator of r/{subreddit}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-300 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setShowCompose(false)}
                className="px-5 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleComposeSend}
                className="flex items-center gap-2 px-5 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 text-sm"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
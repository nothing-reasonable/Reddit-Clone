import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import type { Subreddit } from '../types/domain';
import { Mail, ArrowLeft, Send, Circle, CheckCircle2, Plus, X, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  createModMailThread,
  getSubredditModMailThreads,
  getThreadMessages,
  getUserModMailThreads,
  markThreadRead,
  sendThreadMessage,
  type ModMailMessageDto,
  type ModMailThreadDto
} from '../services/modmailApi';

type MailFilter = 'all' | 'unread' | 'read' | 'appeals' | 'reports';

function parseApiTimestamp(value: string): Date {
  if (!value) return new Date(NaN);
  const hasTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}+06:00`);
}

export default function ModMailPage() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();

  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [threads, setThreads] = useState<ModMailThreadDto[]>([]);
  const [messagesByThread, setMessagesByThread] = useState<Record<number, ModMailMessageDto[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
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

  const isListedModerator = (subredditData?.moderators ?? []).some(
    (moderator) => moderator.toLowerCase() === (user?.username || '').toLowerCase()
  );

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    isListedModerator;

  const isAuthenticated = !!user && !!token;

  const loadThreads = async () => {
    if (!token || !subreddit) return;
    try {
      const data = isModerator
        ? await getSubredditModMailThreads(token, subreddit)
        : await getUserModMailThreads(token);

      const scoped = data.filter((thread) => thread.subredditName.toLowerCase() === subreddit.toLowerCase());
      setThreads(scoped);
      if (selectedThreadId && !scoped.some((thread) => thread.id === selectedThreadId)) {
        setSelectedThreadId(null);
      }
    } catch {
      toast.error('Failed to load modmail threads');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !subredditData || !subreddit) return;
    loadThreads();
    const interval = setInterval(loadThreads, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, subredditData, subreddit, isModerator]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || null;
  const selectedMessages = selectedThreadId ? messagesByThread[selectedThreadId] || [] : [];

  const fetchSelectedMessages = async (threadId: number, silent = false) => {
    if (!token) return;
    try {
      const messages = await getThreadMessages(token, threadId);
      setMessagesByThread((prev) => ({ ...prev, [threadId]: messages }));
      setThreads((prev) => prev.map((thread) => (thread.id === threadId ? { ...thread, unread: false } : thread)));
      await markThreadRead(token, threadId);
    } catch {
      if (!silent) {
        toast.error('Failed to load messages');
      }
    }
  };

  useEffect(() => {
    if (!selectedThreadId || !token) return;

    fetchSelectedMessages(selectedThreadId);
    const interval = setInterval(() => {
      fetchSelectedMessages(selectedThreadId, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedThreadId, token]);

  const filteredThreads = useMemo(() => {
    const byFilter = threads.filter((thread) => {
      const subject = thread.subject.toLowerCase();
      switch (activeFilter) {
        case 'unread':
          return thread.unread;
        case 'read':
          return !thread.unread;
        case 'appeals':
          return subject.includes('removed') || subject.includes('unfairly') || subject.includes('appeal');
        case 'reports':
          return subject.includes('report') || subject.includes('harass');
        default:
          return true;
      }
    });

    return byFilter.sort(
      (a, b) => parseApiTimestamp(b.updatedAt).getTime() - parseApiTimestamp(a.updatedAt).getTime()
    );
  }, [activeFilter, threads]);

  const handleOpenThread = (threadId: number) => {
    setSelectedThreadId(threadId);
    fetchSelectedMessages(threadId);
  };

  const handleReply = async () => {
    if (!token || !selectedThreadId || !replyText.trim()) return;
    try {
      const sent = await sendThreadMessage(token, selectedThreadId, replyText);
      setMessagesByThread((prev) => ({
        ...prev,
        [selectedThreadId]: [...(prev[selectedThreadId] || []), sent]
      }));
      setReplyText('');
      await loadThreads();
      toast.success('Reply sent');
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const handleComposeSend = async () => {
    if (!token || !subreddit) return;
    const effectiveRecipient = isModerator ? composeRecipient.trim() : (user?.username ?? '');

    if (!effectiveRecipient || !composeSubject.trim() || !composeContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const created = await createModMailThread(
        token,
        subreddit,
        effectiveRecipient,
        composeSubject.trim(),
        composeContent.trim()
      );
      setShowCompose(false);
      setComposeRecipient('');
      setComposeSubject('');
      setComposeContent('');
      await loadThreads();
      setSelectedThreadId(created.id);
      await fetchSelectedMessages(created.id);
      toast.success('Message sent');
    } catch {
      toast.error('Failed to create modmail thread');
    }
  };

  const filters: { id: MailFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: threads.length },
    { id: 'unread', label: 'Unread', count: threads.filter((thread) => thread.unread).length },
    { id: 'read', label: 'Read', count: threads.filter((thread) => !thread.unread).length },
    { id: 'appeals', label: 'Appeals' },
    { id: 'reports', label: 'Reports' }
  ];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading mod mail...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
          <p className="text-gray-600 mb-4">You must be signed in to view messages.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3">
          <Link to={`/r/${subreddit}`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-500" />
              {isModerator ? 'Mod Mail' : 'Messages'}
            </h1>
            <p className="text-gray-600">
              r/{subreddit} - {threads.filter((thread) => thread.unread).length} unread
              {!isModerator && ' (Your messages)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Filter className="w-4 h-4 text-gray-400" />
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFilter === filter.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              {filter.count !== undefined && (
                <span className={`ml-1 ${activeFilter === filter.id ? 'opacity-80' : 'text-gray-400'}`}>
                  ({filter.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-16rem)] relative">
        <div className="w-96 bg-white border border-gray-300 rounded overflow-y-auto shrink-0">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages match this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleOpenThread(thread.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedThreadId === thread.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  } ${thread.unread ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {thread.unread ? (
                      <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500 mt-2 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5 text-gray-300 mt-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${thread.unread ? 'font-bold' : 'font-medium'}`}>
                          u/{thread.username}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(parseApiTimestamp(thread.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className={`text-sm ${thread.unread ? 'font-semibold' : ''} truncate`}>
                        {thread.subject}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {thread.lastMessagePreview}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 bg-white border border-gray-300 rounded overflow-y-auto">
          {selectedThread ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-gray-300">
                <h2 className="font-bold text-lg">{selectedThread.subject}</h2>
                <div className="text-sm text-gray-600 mt-1">
                  With <Link to={`/user/${selectedThread.username}`} className="text-blue-500 hover:underline">u/{selectedThread.username}</Link>
                  {' • '}
                  {formatDistanceToNow(parseApiTimestamp(selectedThread.updatedAt), { addSuffix: true })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedMessages.map((message) => {
                  const isUser = message.senderType === 'USER';
                  const display = isUser ? `u/${message.senderDisplayName}` : message.senderDisplayName;
                  return (
                    <div key={message.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isUser ? 'bg-gray-200' : 'bg-green-500'
                      }`}>
                        <span className={`text-sm font-semibold ${isUser ? '' : 'text-white'}`}>
                          {display.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{display}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isUser
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-green-100 text-green-700 font-semibold'
                          }`}>
                            {isUser ? 'User' : 'MOD'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(parseApiTimestamp(message.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className={`rounded-lg p-3 text-sm ${
                          isUser
                            ? 'bg-gray-50 border-l-4 border-gray-300'
                            : 'bg-green-50 border border-green-200 border-l-4 border-l-green-500'
                        }`}>
                          {message.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-300 p-4">
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">{user!.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder={isModerator ? 'Type your reply as moderator...' : 'Type your message...'}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                      onKeyDown={(event) => event.key === 'Enter' && handleReply()}
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

        <button
          onClick={() => {
            if (!isModerator && user?.username) {
              setComposeRecipient(user.username);
            }
            setShowCompose(true);
          }}
          className="absolute bottom-4 right-188 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 flex items-center justify-center transition-transform hover:scale-105"
          title={isModerator ? 'Compose New Message' : 'Message Moderators'}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-green-50">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                {isModerator ? 'Compose New Message' : 'Message Moderators'}
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
                  onChange={(event) => setComposeRecipient(event.target.value)}
                  placeholder={isModerator ? 'e.g. username123' : user?.username}
                  disabled={!isModerator}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(event) => setComposeSubject(event.target.value)}
                  placeholder="Message subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea
                  value={composeContent}
                  onChange={(event) => setComposeContent(event.target.value)}
                  placeholder="Write your message..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                {isModerator
                  ? `Sending as moderator of r/${subreddit}`
                  : `Sending to r/${subreddit} mods as u/${user?.username}`}
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

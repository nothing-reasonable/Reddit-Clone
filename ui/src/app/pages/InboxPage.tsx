import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { UserMessage } from '../types/domain';
import { Mail, Send, Inbox, Circle, Trash2, X, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type Tab = 'inbox' | 'sent' | 'all';

export default function InboxPage() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Messages</h1>
          <p className="text-gray-600 mb-4">Please log in to view your messages.</p>
          <Link to="/login" className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const inboxMessages = messages.filter((m) => m.to === user.username && !m.parentId);
  const sentMessages = messages.filter((m) => m.from === user.username && !m.parentId);
  const allMessages = messages.filter((m) => (m.to === user.username || m.from === user.username) && !m.parentId);

  const displayMessages = activeTab === 'inbox' ? inboxMessages : activeTab === 'sent' ? sentMessages : allMessages;
  const unreadCount = inboxMessages.filter((m) => !m.read).length;

  const getReplies = (parentId: string) =>
    messages.filter((m) => m.parentId === parentId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const handleMarkRead = (id: string) => {
    setMessages(messages.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const handleDelete = (id: string) => {
    setMessages(messages.filter((m) => m.id !== id && m.parentId !== id));
    if (selectedMessage === id) setSelectedMessage(null);
    toast.success('Message deleted');
  };

  const handleReply = (parentId: string) => {
    if (!replyText.trim()) return;
    const parent = messages.find((m) => m.id === parentId);
    if (!parent) return;
    const reply = {
      id: 'dm-' + Math.random().toString(36).substr(2, 9),
      from: user.username,
      to: parent.from === user.username ? parent.to : parent.from,
      subject: 're: ' + parent.subject.replace(/^re: /i, ''),
      content: replyText,
      timestamp: new Date(),
      read: true,
      parentId: parentId,
    };
    setMessages([...messages, reply]);
    setReplyText('');
    toast.success('Reply sent!');
  };

  const handleSendNew = () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    const newMsg = {
      id: 'dm-' + Math.random().toString(36).substr(2, 9),
      from: user.username,
      to: composeTo.trim(),
      subject: composeSubject.trim(),
      content: composeBody.trim(),
      timestamp: new Date(),
      read: true,
    };
    setMessages([newMsg, ...messages]);
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    toast.success('Message sent!');
  };

  const selectedMsg = messages.find((m) => m.id === selectedMessage);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', count: unreadCount > 0 ? unreadCount : undefined },
    { id: 'sent', label: 'Sent' },
    { id: 'all', label: 'All Messages' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white border border-gray-300 rounded mb-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-500" />
            Messages
          </h1>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            New Message
          </button>
        </div>
        <div className="flex gap-0 border-b border-gray-200 -mx-4 px-4 -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedMessage(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.count && (
                <span className="px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Message List */}
        <div className={`${selectedMsg ? 'hidden md:block md:w-96' : 'w-full'} shrink-0`}>
          <div className="bg-white border border-gray-300 rounded overflow-hidden">
            {displayMessages.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No messages here yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayMessages.map((msg) => {
                  const isSelected = selectedMessage === msg.id;
                  const otherUser = msg.from === user.username ? msg.to : msg.from;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => { setSelectedMessage(msg.id); handleMarkRead(msg.id); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-2 border-l-orange-500' : ''
                      } ${!msg.read && msg.to === user.username ? 'bg-orange-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-gray-600">
                            {otherUser.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {!msg.read && msg.to === user.username && (
                              <Circle className="w-2 h-2 fill-orange-500 text-orange-500 shrink-0" />
                            )}
                            <span className="text-sm font-semibold truncate">
                              {msg.from === user.username ? (
                                <span className="text-gray-500">To u/{msg.to}</span>
                              ) : (
                                <>u/{msg.from}</>
                              )}
                            </span>
                            <span className="text-[11px] text-gray-400 ml-auto shrink-0">
                              {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">{msg.subject}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        {selectedMsg && (
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-300 rounded overflow-hidden">
              {/* Detail Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg truncate">{selectedMsg.subject}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      {selectedMsg.from === user.username ? (
                        <>You &rarr; <Link to={`/user/${selectedMsg.to}`} className="text-blue-500 hover:underline">u/{selectedMsg.to}</Link></>
                      ) : (
                        <><Link to={`/user/${selectedMsg.from}`} className="text-blue-500 hover:underline">u/{selectedMsg.from}</Link> &rarr; You</>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(selectedMsg.id)}
                    className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-2 hover:bg-gray-100 rounded text-gray-400 md:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Thread */}
              <div className="divide-y divide-gray-100">
                {/* Original message */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">
                        {selectedMsg.from.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <Link to={`/user/${selectedMsg.from}`} className="text-sm font-semibold text-blue-500 hover:underline">
                        u/{selectedMsg.from}
                      </Link>
                      <span className="text-[11px] text-gray-400 ml-2">
                        {formatDistanceToNow(selectedMsg.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap ml-10">{selectedMsg.content}</p>
                </div>

                {/* Replies */}
                {getReplies(selectedMsg.id).map((reply) => (
                  <div key={reply.id} className="px-5 py-4 bg-gray-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        reply.from === user.username ? 'bg-blue-100' : 'bg-orange-100'
                      }`}>
                        <span className={`text-sm font-bold ${reply.from === user.username ? 'text-blue-600' : 'text-orange-600'}`}>
                          {reply.from.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <Link to={`/user/${reply.from}`} className="text-sm font-semibold text-blue-500 hover:underline">
                          u/{reply.from}
                        </Link>
                        {reply.from === user.username && (
                          <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">you</span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-2">
                          {formatDistanceToNow(reply.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap ml-10">{reply.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 text-sm resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleReply(selectedMsg.id)}
                        disabled={!replyText.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-lg">New Message</h2>
              <button onClick={() => setShowCompose(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">To</label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-400">u/</span>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="username"
                    className="flex-1 focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCompose(false)}
                className="px-5 py-2 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNew}
                className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
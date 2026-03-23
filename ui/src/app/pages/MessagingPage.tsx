import React, { useState, useEffect } from 'react';
import { Mail, Send, User, ChevronRight, Search, Plus, X, MessageSquare, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserConversations, 
  getConversationMessages, 
  sendMessage, 
  createConversation,
  closeConversation,
  ConversationDto,
  MessageDto 
} from '../services/messagingApi';

export default function MessagingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Compose Modal State
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeContent, setComposeContent] = useState('');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchConversations();
    const interval = setInterval(() => fetchConversations(true), 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      const interval = setInterval(() => fetchMessages(selectedId, true), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  // Scroll to bottom when messages change AND user was already near bottom (or it's the first load)
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const fetchConversations = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setIsLoading(true);
      const data = await getUserConversations(token);
      setConversations(data);
    } catch (err) {
      if (!silent) toast.error('Failed to load conversations');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchMessages = async (id: number, silent = false) => {
    if (!token) return;
    try {
      if (!silent) setIsLoadingMessages(true);
      const data = await getConversationMessages(token, String(id));
      setMessages(data);
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  const handleReply = async () => {
    if (!token || !selectedId || !replyText.trim()) return;
    try {
      const newMsg = await sendMessage(token, String(selectedId), replyText);
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      fetchConversations(true); 
      setTimeout(() => scrollToBottom(), 50);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleComposeSend = async () => {
    if (!token || !composeRecipient.trim() || !composeContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const newConv = await createConversation(token, composeRecipient, composeContent);
      setConversations([newConv, ...conversations]);
      setSelectedId(newConv.id);
      setShowCompose(false);
      setComposeRecipient('');
      setComposeContent('');
      toast.success('Message sent');
    } catch (err) {
      toast.error('Failed to start conversation');
    }
  };

  const filteredConversations = [...conversations].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const selected = conversations.find(c => c.id === selectedId);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-500 text-sm">Direct messaging with other redditors</p>
            </div>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden bg-white border-x border-b border-gray-300 rounded-b-lg shadow-sm">
        {/* Sidebar: Conversation List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic">
                No conversations found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedId(conv.id);
                      // Optimistically mark as read
                      setConversations(prev => prev.map(c => 
                        c.id === conv.id ? { ...c, unread: false } : c
                      ));
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors relative ${
                      selectedId === conv.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm truncate ${conv.unread ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>
                            u/{conv.otherUser}
                            {conv.unread && <span className="ml-2 inline-block w-2 h-2 bg-orange-500 rounded-full" />}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.lastMessagePreview || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50/30">
          {selectedId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">u/{selected?.otherUser}</h2>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {selected?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-pulse text-gray-400 text-sm">Loading chat...</div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderDisplayName === user?.username;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                          isMe ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <div className={`text-[10px] mt-1 ${isMe ? 'text-orange-100' : 'text-gray-400'}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2 bg-gray-100 rounded-full px-4 py-2 items-center focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="p-1 text-orange-500 hover:text-orange-600 disabled:text-gray-300 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center" id="empty-state">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-bold mb-1">Your Messages</h3>
              <p className="text-sm max-w-xs">Select a conversation from the sidebar or start a new one to begin chatting.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">New Message</h2>
              <button onClick={() => setShowCompose(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Recipient Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm italic font-medium">u/</span>
                  <input
                    type="text"
                    id="recipient-input"
                    value={composeRecipient}
                    onChange={(e) => setComposeRecipient(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Message</label>
                <textarea
                  id="message-input"
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  placeholder="Say hi..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                id="cancel-compose"
              >
                Cancel
              </button>
              <button
                onClick={handleComposeSend}
                disabled={!composeRecipient.trim() || !composeContent.trim()}
                className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                id="send-compose"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
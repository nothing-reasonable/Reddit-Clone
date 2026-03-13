import { Outlet, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { Search, Bell, Plus, Menu, LogOut, User, Shield, X, TrendingUp, Home as HomeIcon, ChevronDown, Mail, Users } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { subreddits, notifications as mockNotifications, userMessages, formatNumber } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const { joinedSubreddits } = useSubreddit();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadDMs = userMessages.filter((m) => m.to === (user?.username || '') && !m.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchSuggestions(false);
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const filteredSubs = searchQuery.trim()
    ? subreddits.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const myModeratedSubs = subreddits.filter((s) =>
    user?.isModerator && s.moderators.includes(user.username)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">r</span>
              </div>
              <span className="font-bold text-xl hidden sm:block text-orange-600">reddit</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(e.target.value.trim().length > 0);
                }}
                onFocus={() => searchQuery.trim() && setShowSearchSuggestions(true)}
                placeholder="Search Reddit"
                className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:border-blue-500 focus:bg-white text-sm hover:border-blue-400 hover:bg-white transition-colors"
              />
              {/* Search Suggestions */}
              {showSearchSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {filteredSubs.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">Communities</div>
                      {filteredSubs.slice(0, 5).map((sub) => (
                        <Link
                          key={sub.name}
                          to={`/r/${sub.name}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                          onClick={() => { setShowSearchSuggestions(false); setSearchQuery(''); }}
                        >
                          <span className="text-xl">{sub.icon}</span>
                          <div>
                            <div className="font-medium text-sm">r/{sub.name}</div>
                            <div className="text-xs text-gray-500">{formatNumber(sub.members)} members</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleSearch}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blue-500 hover:bg-gray-50 border-t border-gray-100"
                  >
                    <Search className="w-4 h-4" />
                    Search for &ldquo;{searchQuery}&rdquo;
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1 shrink-0">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 hover:bg-gray-100 rounded-full relative"
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <span className="font-bold">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-blue-500 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                        ) : (
                          notifications.map((notif) => (
                            <Link
                              key={notif.id}
                              to={notif.link}
                              onClick={() => {
                                setNotifications(notifications.map((n) => n.id === notif.id ? { ...n, read: true } : n));
                                setShowNotifications(false);
                              }}
                              className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${
                                !notif.read ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {!notif.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                )}
                                <div className={`flex-1 ${notif.read ? 'ml-4' : ''}`}>
                                  <p className="text-sm">{notif.content}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inbox - User Messages */}
                <Link
                  to="/inbox"
                  className="p-2 hover:bg-gray-100 rounded-full relative"
                  title="Messages"
                >
                  <Mail className="w-5 h-5 text-gray-600" />
                  {unreadDMs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadDMs}
                    </span>
                  )}
                </Link>

                <Link
                  to="/submit"
                  className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-full text-gray-600"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">Create</span>
                </Link>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                  >
                    <div className="w-7 h-7 bg-orange-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {user?.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-medium leading-tight">{user?.username}</div>
                      <div className="text-[10px] text-gray-500 leading-tight">{formatNumber(user?.karma || 0)} karma</div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-orange-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {user?.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-sm">u/{user?.username}</div>
                            <div className="text-xs text-gray-500">{formatNumber(user?.karma || 0)} karma</div>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/user/${user?.username}`}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4 text-gray-500" />
                        Profile
                      </Link>
                      <Link
                        to="/inbox"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Mail className="w-4 h-4 text-gray-500" />
                        Messages
                        {unreadDMs > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-full font-bold">
                            {unreadDMs}
                          </span>
                        )}
                      </Link>
                      {user?.isModerator && myModeratedSubs.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase">Mod Tools</div>
                          {myModeratedSubs.slice(0, 3).map((sub) => (
                            <Link
                              key={sub.name}
                              to={`/r/${sub.name}/mod`}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-sm"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Shield className="w-4 h-4 text-green-600" />
                              r/{sub.name}
                            </Link>
                          ))}
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm"
                      >
                        <LogOut className="w-4 h-4 text-gray-500" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 text-sm bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex max-w-[1440px] mx-auto">
        {/* Sidebar */}
        <aside
          className={`${
            showSidebar ? 'block' : 'hidden'
          } lg:block w-64 bg-white border-r border-gray-200 fixed lg:sticky top-12 left-0 h-[calc(100vh-3rem)] overflow-y-auto z-40 shrink-0`}
        >
          <div className="p-3">
            {/* Navigation */}
            <div className="mb-4">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-sm font-medium"
                onClick={() => setShowSidebar(false)}
              >
                <HomeIcon className="w-5 h-5" />
                Home
              </Link>
              <Link
                to="/?sort=top"
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-sm font-medium"
                onClick={() => setShowSidebar(false)}
              >
                <TrendingUp className="w-5 h-5" />
                Popular
              </Link>
            </div>

            {/* Resources */}
            <div className="border-t border-gray-200 pt-3 mb-3" />
            <div className="mb-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-1">
                Resources
              </h3>
              <Link
                to="/create-community"
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-sm font-medium"
                onClick={() => setShowSidebar(false)}
              >
                <Plus className="w-5 h-5" />
                Create a Community
              </Link>
            </div>

            <div className="border-t border-gray-200 pt-3 mb-3" />

            {/* Joined Communities */}
            {joinedSubreddits.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-1">
                  Your Communities
                </h3>
                {joinedSubreddits.map((sub) => {
                  const subData = subreddits.find((s) => s.name === sub.name);
                  return (
                    <Link
                      key={sub.name}
                      to={`/r/${sub.name}`}
                      className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100 rounded"
                      onClick={() => setShowSidebar(false)}
                    >
                      <span className="text-lg">{subData?.icon || '📌'}</span>
                      <span className="text-sm font-medium truncate">r/{sub.name}</span>
                      {sub.role === 'moderator' && (
                        <Shield className="w-3 h-3 text-green-600 shrink-0 ml-auto" />
                      )}
                    </Link>
                  );
                })}
                <div className="border-t border-gray-200 pt-3 mt-3 mb-3" />
              </div>
            )}

            {/* All Communities */}
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-1">
              Popular Communities
            </h3>
            <div className="space-y-0.5">
              {subreddits.map((sub) => (
                <Link
                  key={sub.name}
                  to={`/r/${sub.name}`}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100 rounded"
                  onClick={() => setShowSidebar(false)}
                >
                  <span className="text-lg">{sub.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">r/{sub.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {formatNumber(sub.members)} members
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 mt-4 pt-4 px-3">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Reddit Clone &#8226; Built with React + Tailwind
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
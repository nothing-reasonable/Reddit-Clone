import { useParams, Link } from 'react-router';
import { useEffect, useState } from 'react';
import PostCard from '../components/PostCard';
import { formatNumber } from '../utils/format';
import { TrendingUp, Sparkles, Clock, Flame, Settings, Shield, UserPlus, CheckCircle, Plus, BookOpen, Users, Calendar, ChevronDown, Flag, FileText, Mail, BarChart3, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  getSubredditByName,
  joinSubredditMembership,
  leaveSubredditMembership,
  resignModeratorRole,
  requestSubredditTakeover,
} from '../services/subredditApi';
import { getSubredditPosts } from '../services/contentApi';
import type { Post, Subreddit } from '../types/domain';

type TopDuration = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export default function SubredditPage() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [topDuration, setTopDuration] = useState<TopDuration>('day');
  const [showModTools, setShowModTools] = useState(false);
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [subredditPosts, setSubredditPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSubreddit, setLoadingSubreddit] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [membershipUpdating, setMembershipUpdating] = useState(false);
  const [takeoverRequesting, setTakeoverRequesting] = useState(false);
  const [takeoverRequested, setTakeoverRequested] = useState(false);
  const { user, isAuthenticated, token } = useAuth();
  const {
    joinSubreddit,
    leaveSubreddit,
    isJoined,
    applyAsModerator,
    pendingModApplications,
  } = useSubreddit();

  useEffect(() => {
    let cancelled = false;

    async function loadSubreddit() {
      if (!subreddit) {
        setSubredditData(null);
        setLoadingSubreddit(false);
        return;
      }

      setLoadingSubreddit(true);
      setLoadError(null);

      try {
        const backendData = await getSubredditByName(subreddit);
        if (cancelled) return;
        setSubredditData(backendData);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load subreddit';
        setLoadError(message);
        setSubredditData(null);
      } finally {
        if (!cancelled) setLoadingSubreddit(false);
      }
    }

    void loadSubreddit();

    return () => {
      cancelled = true;
    };
  }, [subreddit]);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      if (!subreddit) {
        setSubredditPosts([]);
        setLoadingPosts(false);
        return;
      }

      setLoadingPosts(true);
      try {
        const data = await getSubredditPosts(subreddit, sortBy);
        if (!cancelled) setSubredditPosts(data);
      } catch {
        if (!cancelled) setSubredditPosts([]);
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    }

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [subreddit, sortBy]);

  const sortedPosts = [...subredditPosts].sort((a, b) => {
    if (sortBy === 'hot') return b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
    if (sortBy === 'new') return b.createdAt.getTime() - a.createdAt.getTime();
    if (sortBy === 'rising') return (b.upvotes / (b.downvotes || 1)) - (a.upvotes / (a.downvotes || 1));
    return b.upvotes - a.upvotes;
  });

  const joined = isJoined(subreddit || '') || 
    // If they're a moderator, they must be a member
    (subredditData?.moderators ?? []).some(
      (moderator) => moderator.toLowerCase() === (user?.username || '').toLowerCase()
    );
  const isModerator =
    (subredditData?.moderators ?? []).some(
      (moderator) => moderator.toLowerCase() === (user?.username || '').toLowerCase()
    ) ||
    false;
  const hasPendingApplication = pendingModApplications.includes(subreddit || '');

  const handleJoinLeave = async () => {
    if (!isAuthenticated || !token) {
      toast.error('Please log in to join communities');
      return;
    }

    if (!subreddit) {
      return;
    }

    setMembershipUpdating(true);
    try {
      if (!joined && subredditData?.archived) {
        toast.error('This community is archived. Join is disabled.');
        return;
      }

      if (joined) {
        await leaveSubredditMembership(token, subreddit);
        leaveSubreddit(subreddit);
        toast.success(`Left r/${subreddit}`);
      } else {
        await joinSubredditMembership(token, subreddit);
        joinSubreddit(subreddit);
        toast.success(`Joined r/${subreddit}!`);
      }

      const refreshed = await getSubredditByName(subreddit);
      if (refreshed) {
        setSubredditData(refreshed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update membership.');
    } finally {
      setMembershipUpdating(false);
    }
  };

  const handleRequestTakeover = async () => {
    if (!isAuthenticated || !token || !subreddit) {
      toast.error('Please log in to request subreddit takeover.');
      return;
    }

    setTakeoverRequesting(true);
    try {
      await requestSubredditTakeover(token, subreddit);
      setTakeoverRequested(true);
      toast.success('Takeover request submitted. Reddit admins will review it.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit takeover request.');
    } finally {
      setTakeoverRequesting(false);
    }
  };

  const handleResignModeratorRole = async () => {
    if (!isAuthenticated || !token) {
      toast.error('Please log in to update moderator status');
      return;
    }

    if (!subreddit) {
      return;
    }

    setMembershipUpdating(true);
    try {
      await resignModeratorRole(token, subreddit);
      joinSubreddit(subreddit, 'member');
      const refreshed = await getSubredditByName(subreddit);
      if (refreshed) {
        setSubredditData(refreshed);
      }
      toast.success('You left the moderator team. You can now leave the community.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not leave moderator role.');
    } finally {
      setMembershipUpdating(false);
    }
  };

  const handleApplyModerator = () => {
    if (!isAuthenticated) { toast.error('Please log in to apply as moderator'); return; }
    if (!joined) { toast.error('You must be a member to apply as moderator'); return; }
    applyAsModerator(subreddit || '');
    toast.success('Application submitted!');
  };

  if (loadingSubreddit) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Loading subreddit...</h1>
          <p className="text-gray-600">Fetching r/{subreddit}.</p>
        </div>
      </div>
    );
  }

  if (!subredditData) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Subreddit not found</h1>
          <p className="text-gray-600">The subreddit r/{subreddit} does not exist.</p>
          {loadError && <p className="text-red-500 text-sm mt-3">{loadError}</p>}
        </div>
      </div>
    );
  }

  const sortOptions = [
    { id: 'hot' as const, label: 'Hot', icon: Flame },
    { id: 'new' as const, label: 'New', icon: Sparkles },
    { id: 'top' as const, label: 'Top', icon: TrendingUp },
    { id: 'rising' as const, label: 'Rising', icon: Clock },
  ];

  const topDurations: { id: TopDuration; label: string }[] = [
    { id: 'hour', label: 'Past Hour' },
    { id: 'day', label: '24 Hours' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div>
      {/* Banner */}
      <div className="h-24 md:h-32 bg-cover bg-center relative" style={{ backgroundImage: `url(${subredditData.banner})` }}>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 -mt-8 bg-white rounded-full border-4 border-white flex items-center justify-center text-3xl relative z-10">
              {subredditData.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">r/{subredditData.name}</h1>
                <button
                  onClick={handleJoinLeave}
                  disabled={membershipUpdating || (!joined && !!subredditData.archived)}
                  className={`px-5 py-1 rounded-full text-sm font-semibold transition-colors ${
                    joined ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                  } ${membershipUpdating || (!joined && !!subredditData.archived) ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {joined ? 'Joined' : subredditData.archived ? 'Archived' : 'Join'}
                </button>
                {isModerator && (
                  <button
                    onClick={handleResignModeratorRole}
                    disabled={membershipUpdating}
                    className={`px-3 py-1 border border-amber-300 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-50 transition-colors ${membershipUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    Leave Mod Role
                  </button>
                )}
                {/* Apply as Moderator - visible next to community name */}
                {!isModerator && !hasPendingApplication && isAuthenticated && joined && (
                  <button
                    onClick={handleApplyModerator}
                    className="flex items-center gap-1.5 px-3 py-1 border border-green-400 text-green-700 rounded-full text-sm font-semibold hover:bg-green-50 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Apply as Moderator
                  </button>
                )}
                {hasPendingApplication && !isModerator && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-sm font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Application Pending
                  </span>
                )}
                {isModerator && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                    <Shield className="w-3.5 h-3.5" />
                    Moderator
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">r/{subredditData.name}</p>
              {subredditData.archived && (
                <p className="text-xs text-amber-700 mt-1">This community is archived because it currently has no active moderators.</p>
              )}
              {subredditData.archived && !isModerator && isAuthenticated && (
                <div className="mt-2">
                  <button
                    onClick={handleRequestTakeover}
                    disabled={takeoverRequesting || takeoverRequested}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 ${takeoverRequesting || takeoverRequested ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {takeoverRequested ? 'Takeover Requested' : 'Request This Subreddit'}
                  </button>
                </div>
              )}
            </div>

            {/* Mod Tools Button */}
            {isModerator && (
              <div className="relative">
                <button
                  onClick={() => setShowModTools(!showModTools)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50"
                >
                  <Shield className="w-4 h-4 text-green-600" />
                  Mod Tools
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showModTools && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link to={`/r/${subreddit}/mod`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <Shield className="w-4 h-4 text-green-600" /> Mod Dashboard
                    </Link>
                    <Link to={`/r/${subreddit}/modqueue`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <Flag className="w-4 h-4 text-red-500" /> Mod Queue
                    </Link>
                    <Link to={`/r/${subreddit}/mod/log`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <FileText className="w-4 h-4 text-blue-500" /> Mod Log
                    </Link>
                    <Link to={`/r/${subreddit}/mod/banned`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <UserX className="w-4 h-4 text-orange-500" /> Banned Users
                    </Link>

                    <Link to={`/r/${subreddit}/automod`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <Settings className="w-4 h-4" /> AutoMod
                    </Link>
                    <Link to={`/r/${subreddit}/modmail`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <Mail className="w-4 h-4" /> Mod Mail
                    </Link>
                    <Link to={`/r/${subreddit}/mod/settings`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <Users className="w-4 h-4" /> Community Settings
                    </Link>
                    <Link to={`/r/${subreddit}/mod/traffic`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => setShowModTools(false)}>
                      <BarChart3 className="w-4 h-4" /> Traffic Stats
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 flex gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Create Post */}
          {isAuthenticated && !subredditData.archived && (
            <Link
              to={`/submit?subreddit=${subreddit}`}
              className="flex items-center gap-3 bg-white border border-gray-300 rounded p-2 mb-3 hover:border-gray-400 transition-colors"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-full px-4 py-1.5 text-sm text-gray-500 border border-gray-200">
                Create Post
              </div>
            </Link>
          )}
          {isAuthenticated && subredditData.archived && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded p-3 mb-3 text-sm">
              Posting is disabled because this community is archived.
            </div>
          )}

          {/* Sort Options */}
          <div className="bg-white border border-gray-300 rounded mb-3 p-2">
            <div className="flex gap-1 flex-wrap items-center">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    sortBy === opt.id ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  <span>{opt.label}</span>
                </button>
              ))}

              {/* Top Duration Selector */}
              {sortBy === 'top' && (
                <>
                  <div className="w-px h-5 bg-gray-300 mx-1" />
                  {topDurations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setTopDuration(d.id)}
                      className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                        topDuration === d.id
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-3">
            {loadingPosts ? (
              <div className="bg-white border border-gray-300 rounded p-8 text-center">
                <p className="text-gray-600">Loading posts...</p>
              </div>
            ) : sortedPosts.length > 0 ? (
              sortedPosts.map((post) => <PostCard key={post.id} post={post} showSubreddit={false} />)
            ) : (
              <div className="bg-white border border-gray-300 rounded p-8 text-center">
                <p className="text-gray-600">No posts yet in this subreddit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80 shrink-0">
          {/* About Community */}
          <div className="bg-white border border-gray-300 rounded sticky top-16 overflow-hidden">
            <div className="bg-blue-500 px-4 py-3">
              <h2 className="font-bold text-white text-sm">About Community</h2>
            </div>
            <div className="p-4">
              {subredditData.archived && (
                <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5">
                  Archived community: users can request moderator takeover through admin review.
                </div>
              )}
              <p className="text-sm text-gray-700 mb-3">{subredditData.longDescription || subredditData.description}</p>

              <div className="flex gap-4 py-3 border-t border-b border-gray-200 mb-3">
                <div>
                  <div className="font-bold">{formatNumber(subredditData.members)}</div>
                  <div className="text-xs text-gray-500">Members</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{formatNumber(subredditData.online)}</div>
                  <div className="text-xs text-gray-500">Online</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Calendar className="w-3.5 h-3.5" />
                Created {formatDistanceToNow(subredditData.createdAt, { addSuffix: true })}
              </div>

              <Link
                to={`/submit?subreddit=${subreddit}`}
                className="block w-full text-center px-4 py-1.5 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 mb-2"
              >
                Create Post
              </Link>

              {!isModerator && !hasPendingApplication && (
                <button
                  className="flex items-center justify-center gap-1.5 w-full px-4 py-1.5 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50"
                  onClick={handleApplyModerator}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Apply as Moderator
                </button>
              )}
              {hasPendingApplication && !isModerator && (
                <button className="flex items-center justify-center gap-1.5 w-full px-4 py-1.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-400" disabled>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Application Pending
                </button>
              )}
            </div>

            {/* Rules */}
            {subredditData.rules.length > 0 && (
              <div className="border-t border-gray-200">
                <div className="px-4 py-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="font-bold text-sm">r/{subreddit} Rules</span>
                </div>
                <div className="px-4 pb-3 space-y-2">
                  {subredditData.rules.map((rule, idx) => (
                    <details key={rule.id} className="group">
                      <summary className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600 list-none">
                        <span className="font-semibold text-gray-400 w-4 text-center">{idx + 1}</span>
                        <span className="font-medium">{rule.title}</span>
                      </summary>
                      {rule.description && (
                        <p className="text-xs text-gray-600 ml-6 mt-1">{rule.description}</p>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Flairs */}
            {subredditData.flairs.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="font-bold text-sm mb-2">Post Flairs</div>
                <div className="flex flex-wrap gap-1.5">
                  {subredditData.flairs.map((flair) => (
                    <span key={flair} className="px-2 py-0.5 bg-gray-100 text-xs rounded-full">
                      {flair}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Community Links */}
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="font-bold text-sm mb-2">Community Links</div>
              <div className="space-y-1">
                <Link
                  to={`/r/${subreddit}/wiki`}
                  className="flex items-center gap-2 text-xs text-blue-500 hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Wiki
                </Link>
                {isAuthenticated && (
                  <Link
                    to={`/r/${subreddit}/modmail`}
                    className="flex items-center gap-2 text-xs text-blue-500 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {isModerator ? 'Mod Mail' : 'Messages'}
                  </Link>
                )}
              </div>
            </div>

            {/* Mod Tools shortcut for mods */}
            {isModerator && (
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="font-bold text-sm mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-green-600" />
                  Mod Shortcuts
                </div>
                <div className="space-y-1">

                  <Link to={`/r/${subreddit}/modqueue`} className="flex items-center gap-2 text-xs text-blue-500 hover:underline">
                    <Flag className="w-3.5 h-3.5" />
                    Mod Queue
                  </Link>
                  <Link to={`/r/${subreddit}/mod`} className="flex items-center gap-2 text-xs text-blue-500 hover:underline">
                    <Settings className="w-3.5 h-3.5" />
                    All Mod Tools
                  </Link>
                </div>
              </div>
            )}

            {/* Moderators */}
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="font-bold text-sm mb-2">Moderators</div>
              <div className="space-y-1">
                {subredditData.moderators.map((mod) => (
                  <Link key={mod} to={`/user/${mod}`} className="block text-xs text-blue-500 hover:underline">
                    u/{mod}
                  </Link>
                ))}
                {subredditData.moderators.length === 0 && (
                  <div className="text-xs text-gray-500">No active moderators</div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
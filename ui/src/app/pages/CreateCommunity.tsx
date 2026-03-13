import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { subreddits } from '../data/mockData';
import { Users, Eye, Lock, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type CommunityType = 'public' | 'restricted' | 'private';

export default function CreateCommunity() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [communityType, setCommunityType] = useState<CommunityType>('public');
  const [isNSFW, setIsNSFW] = useState(false);

  const nameError = (() => {
    if (!name) return '';
    if (name.length < 3) return 'Community name must be at least 3 characters';
    if (name.length > 21) return 'Community name must be 21 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Only letters, numbers, and underscores allowed';
    if (subreddits.some((s) => s.name.toLowerCase() === name.toLowerCase())) return 'This community already exists';
    return '';
  })();

  const charsRemaining = 21 - name.length;

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto p-4 mt-8">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Create a Community</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to create a community.</p>
          <Link to="/login" className="px-6 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!name || nameError) {
      toast.error(nameError || 'Please enter a community name');
      return;
    }
    // Mock creation - in real app this would persist
    toast.success(`r/${name} created!`, {
      description: 'Your new community is ready.',
    });
    navigate(`/r/${name}`);
  };

  const communityTypes: { id: CommunityType; label: string; description: string; icon: typeof Eye }[] = [
    {
      id: 'public',
      label: 'Public',
      description: 'Anyone can view, post, and comment to this community',
      icon: Eye,
    },
    {
      id: 'restricted',
      label: 'Restricted',
      description: 'Anyone can view this community, but only approved users can post',
      icon: Shield,
    },
    {
      id: 'private',
      label: 'Private',
      description: 'Only approved users can view and submit to this community',
      icon: Lock,
    },
  ];

  return (
    <div className="max-w-lg mx-auto p-4 mt-4">
      <div className="bg-white border border-gray-300 rounded overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-bold">Create a community</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Name</label>
            <p className="text-xs text-gray-500 mb-2">
              Community names including capitalization cannot be changed.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">r/</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                maxLength={21}
                className={`w-full pl-7 pr-4 py-2.5 border rounded-lg focus:outline-none text-sm ${
                  nameError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="community_name"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              {nameError ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {nameError}
                </span>
              ) : (
                <span className="text-xs text-gray-400">&nbsp;</span>
              )}
              <span className={`text-xs ${charsRemaining < 5 ? 'text-red-500' : 'text-gray-400'}`}>
                {charsRemaining} characters remaining
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Description</label>
            <p className="text-xs text-gray-500 mb-2">
              This is how new members come to understand your community.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Tell people what your community is about"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm resize-none"
            />
            <div className="text-right">
              <span className="text-xs text-gray-400">{500 - description.length} characters remaining</span>
            </div>
          </div>

          {/* Community Type */}
          <div>
            <label className="block text-sm font-semibold mb-3">Community type</label>
            <div className="space-y-2">
              {communityTypes.map((ct) => (
                <label
                  key={ct.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    communityType === ct.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="communityType"
                    value={ct.id}
                    checked={communityType === ct.id}
                    onChange={() => setCommunityType(ct.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <ct.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold">{ct.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ct.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* NSFW Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setIsNSFW(!isNSFW)}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${isNSFW ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isNSFW ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
              <div>
                <span className="text-sm font-semibold">18+ year old community</span>
                <p className="text-xs text-gray-500">Turn on if this community contains NSFW content</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 border border-gray-300 rounded-full text-sm font-semibold hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !!nameError}
            className="px-5 py-2 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Community
          </button>
        </div>
      </div>
    </div>
  );
}

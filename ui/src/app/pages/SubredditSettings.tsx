import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { getSubredditByName } from '../services/subredditApi';
import type { Subreddit } from '../types/domain';
import { Users, ArrowLeft, Plus, Trash2, Save, GripVertical, Tag, BookOpen, Edit3, Pencil, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface EditableRule {
  id: string;
  title: string;
  description: string;
}

export default function SubredditSettings() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [flairs, setFlairs] = useState<string[]>([]);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newFlair, setNewFlair] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'flairs'>('general');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  useEffect(() => {
    if (!subredditData) return;
    setDescription(subredditData.description || '');
    setLongDescription(subredditData.longDescription || '');
    setRules(subredditData.rules || []);
    setFlairs(subredditData.flairs || []);
  }, [subredditData]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center text-gray-600">Loading community settings...</div>
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

  const handleSaveGeneral = () => {
    toast.success('Community settings saved!');
  };

  const handleAddRule = () => {
    if (!newRuleTitle.trim()) {
      toast.error('Rule title is required');
      return;
    }
    const rule = {
      id: 'r-' + Math.random().toString(36).substr(2, 9),
      title: newRuleTitle,
      description: newRuleDesc,
    };
    setRules([...rules, rule]);
    setNewRuleTitle('');
    setNewRuleDesc('');
    toast.success('Rule added');
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success('Rule deleted');
  };

  const startEditRule = (rule: EditableRule) => {
    setEditingRuleId(rule.id);
    setEditingTitle(rule.title);
    setEditingDesc(rule.description);
  };

  const saveEditRule = () => {
    if (!editingTitle.trim()) { toast.error('Title is required'); return; }
    setRules(rules.map((r) =>
      r.id === editingRuleId ? { ...r, title: editingTitle, description: editingDesc } : r
    ));
    setEditingRuleId(null);
    toast.success('Rule updated');
  };

  const cancelEditRule = () => {
    setEditingRuleId(null);
  };

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newRules.length) return;
    [newRules[index], newRules[swapIdx]] = [newRules[swapIdx], newRules[index]];
    setRules(newRules);
    toast.success('Rule reordered');
  };

  const handleAddFlair = () => {
    if (!newFlair.trim()) return;
    if (flairs.includes(newFlair)) {
      toast.error('Flair already exists');
      return;
    }
    setFlairs([...flairs, newFlair]);
    setNewFlair('');
    toast.success('Flair added');
  };

  const handleDeleteFlair = (flair: string) => {
    setFlairs(flairs.filter((f) => f !== flair));
    toast.success('Flair removed');
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Edit3 },
    { id: 'rules' as const, label: 'Rules', icon: BookOpen },
    { id: 'flairs' as const, label: 'Post Flairs', icon: Tag },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center gap-3">
          <Link to={`/r/${subreddit}/mod`} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Community Settings
            </h1>
            <p className="text-gray-600">r/{subreddit}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-300 rounded mb-4">
        <div className="flex border-b border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Community Name</label>
                <input
                  type="text"
                  value={`r/${subreddit}`}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Community names cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Short Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Full Description</label>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{longDescription.length}/1000</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Moderators</label>
                <div className="space-y-2">
                  {subredditData?.moderators.map((mod) => (
                    <div key={mod} className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded">
                      <Link to={`/user/${mod}`} className="text-blue-500 hover:underline text-sm">u/{mod}</Link>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Moderator</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveGeneral}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {/* Rules Tab - Editable */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded hover:bg-gray-50 group">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 mt-1">
                      <button
                        onClick={() => moveRule(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveRule(index, 'down')}
                        disabled={index === rules.length - 1}
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1.5 shrink-0 cursor-grab" />
                    <span className="font-bold text-sm text-gray-500 w-6 mt-1">{index + 1}.</span>

                    {editingRuleId === rule.id ? (
                      // Editing mode
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Rule title"
                          autoFocus
                        />
                        <textarea
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          className="w-full px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Description (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditRule}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditRule}
                            className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <div className="flex-1">
                          <div className="font-semibold">{rule.title}</div>
                          {rule.description && (
                            <div className="text-sm text-gray-600 mt-1">{rule.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditRule(rule)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                            title="Edit rule"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-4">
                <h3 className="font-semibold mb-3">Add New Rule</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    placeholder="Rule title"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    placeholder="Rule description (optional)"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddRule}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Flairs Tab */}
          {activeTab === 'flairs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {flairs.map((flair) => (
                  <div
                    key={flair}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full group"
                  >
                    <span className="text-sm font-medium">{flair}</span>
                    <button
                      onClick={() => handleDeleteFlair(flair)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFlair}
                  onChange={(e) => setNewFlair(e.target.value)}
                  placeholder="New flair name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFlair()}
                />
                <button
                  onClick={handleAddFlair}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

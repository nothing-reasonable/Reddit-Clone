import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { useEffect, useState } from 'react';
import {
  Settings, Plus, Trash2, Save, Shield, ArrowLeft, Play, History, FileText,
  Terminal, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  Copy, Pencil, Mail, Lock, Pin, Tag, X, Info, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import yaml from 'js-yaml';
import { testCustomRule } from '../services/moderationApi';
import { getSubredditByName } from '../services/subredditApi';
import type { Subreddit } from '../types/domain';

// ─── Rich Rule Model ───────────────────────────────────────────────────────────

type ConditionField =
  | 'post_title'
  | 'post_body'
  | 'comment_body'
  | 'user_age'
  | 'account_karma'
  | 'post_flair'
  | 'domain'
  | 'author_name';

type Operator = 'contains' | 'matches' | 'greater_than' | 'less_than' | 'equals';

type ActionType =
  | 'approve'
  | 'remove'
  | 'flag'
  | 'send_modmail'
  | 'lock'
  | 'sticky'
  | 'set_flair';


interface RichAutoModRule {
  id: string;
  name: string;
  enabled: boolean;
  conditionField: ConditionField;
  operator: Operator;
  value: string;
  action: ActionType;
  actionFlair?: string;
  messageToUser?: string;
  modmailSubject?: string;
  modmailBody?: string;
  yamlContent?: string;
  lastEditedBy: string;
  lastEditedAt: Date;
  createdAt: Date;
}

// ─── Label Maps ─────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<ConditionField, string> = {
  post_title: 'Post Title',
  post_body: 'Post Body',
  comment_body: 'Comment Body',
  user_age: 'Account Age (days)',
  account_karma: 'Account Karma',
  post_flair: 'Post Flair',
  domain: 'Domain / URL',
  author_name: 'Author Username',
};

const OPERATOR_LABELS: Record<Operator, string> = {
  contains: 'contains',
  matches: 'matches (regex)',
  greater_than: 'greater than',
  less_than: 'less than',
  equals: 'equals',
};

const ACTION_LABELS: Record<ActionType, string> = {
  approve: 'Approve',
  remove: 'Remove',
  flag: 'Flag for Review',
  send_modmail: 'Send Modmail',
  lock: 'Lock Post',
  sticky: 'Sticky Post',
  set_flair: 'Set Flair',
};

const ACTION_COLORS: Record<ActionType, string> = {
  approve: 'text-green-600',
  remove: 'text-red-600',
  flag: 'text-orange-600',
  send_modmail: 'text-blue-600',
  lock: 'text-yellow-600',
  sticky: 'text-purple-600',
  set_flair: 'text-teal-600',
};

const ACTION_ICONS: Record<ActionType, typeof Shield> = {
  approve: CheckCircle,
  remove: XCircle,
  flag: AlertTriangle,
  send_modmail: Mail,
  lock: Lock,
  sticky: Pin,
  set_flair: Tag,
};

function isNumericCondition(c: ConditionField) {
  return c === 'user_age' || c === 'account_karma';
}

function applicableOperators(c: ConditionField): Operator[] {
  if (isNumericCondition(c)) return ['greater_than', 'less_than', 'equals'];
  return ['contains', 'matches', 'equals'];
}

function conditionSummary(r: RichAutoModRule) {
  if (r.yamlContent) {
    const preview = r.yamlContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line !== '---')
      .slice(0, 2)
      .join(' | ');
    return `YAML Rule: ${preview || 'Custom configuration'}`;
  }
  return `If ${CONDITION_LABELS[r.conditionField]} ${OPERATOR_LABELS[r.operator]} "${r.value}"`;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────────

function createSeedRules(sub: string): RichAutoModRule[] {
  void sub;
  return [];
}

const MOCK_EDIT_HISTORY: Array<{ id: string; ruleName: string; editor: string; field: string; oldValue: string; newValue: string; timestamp: Date }> = [];

const MOCK_LOGS: Array<{ id: string; rule: string; action: ActionType; target: string; author: string; timestamp: Date; status: 'removed' | 'flagged' | 'modmailed' | 'flair_set'; modmailSent: boolean }> = [];

// ─── Empty Rule Template ────────────────────────────────────────────────────────

function emptyRule(editor: string): RichAutoModRule {
  return {
    id: '',
    name: '',
    enabled: true,
    conditionField: 'post_title',
    operator: 'contains',
    value: '',
    action: 'flag',
    yamlContent: '---\n# Write your AutoModerator rule here in YAML\ntype: any\naction: flag\n# ...\n',
    lastEditedBy: editor,
    lastEditedAt: new Date(),
    createdAt: new Date(),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AutoModSettings() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user, token } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();

  const [subredditData, setSubredditData] = useState<Subreddit | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSubreddit() {
      if (!subreddit) {
        setSubredditData(null);
        setCommunityLoading(false);
        return;
      }

      setCommunityLoading(true);
      try {
        const backend = await getSubredditByName(subreddit);
        if (cancelled) return;

        if (backend) {
          setSubredditData(backend);
        } else {
          setSubredditData(null);
        }
      } catch {
        if (cancelled) return;
        setSubredditData(null);
      } finally {
        if (!cancelled) setCommunityLoading(false);
      }
    }

    void loadSubreddit();

    return () => {
      cancelled = true;
    };
  }, [subreddit]);

  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (subredditData?.moderators ?? []).some(
      (moderator) => moderator.toLowerCase() === (user?.username || '').toLowerCase()
    );

  const [rules, setRules] = useState<RichAutoModRule[]>(() => createSeedRules(subreddit || ''));
  const [activeTab, setActiveTab] = useState<'rules' | 'history' | 'test' | 'logs'>('rules');

  // Rule editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<RichAutoModRule | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Test console
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testAuthor, setTestAuthor] = useState('');
  const [testKarma, setTestKarma] = useState('100');
  const [testAge, setTestAge] = useState('30');
  const [testDomain, setTestDomain] = useState('');
  const [testFlair, setTestFlair] = useState('');
  const [testResults, setTestResults] = useState<{ rule: string; action: ActionType; message?: string }[]>([]);
  const [testRan, setTestRan] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  
  const [testMode, setTestMode] = useState<'saved' | 'custom'>('saved');
  const [customTestYaml, setCustomTestYaml] = useState('type: any\ntitle (includes): ["test"]\naction: remove');

  // Logs filter
  const [logFilter, setLogFilter] = useState<'all' | 'removed' | 'flagged' | 'modmailed' | 'flair_set'>('all');

  const parseCustomYamlDocuments = (rawYaml: string): string[] => {
    const parsedDocs: unknown[] = [];
    yaml.loadAll(rawYaml, (doc) => {
      if (doc !== undefined && doc !== null) {
        parsedDocs.push(doc);
      }
    });

    if (parsedDocs.length === 0) {
      throw new Error('Custom YAML must include at least one rule.');
    }

    return parsedDocs.map((doc) => yaml.dump(doc, { lineWidth: -1 }));
  };

  if (communityLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Loading AutoMod...</h1>
          <p className="text-gray-600">Checking access for r/{subreddit}.</p>
        </div>
      </div>
    );
  }

  if (!subredditData) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Subreddit not found</h1>
          <p className="text-gray-600 mb-4">The subreddit r/{subreddit} does not exist.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white border border-gray-300 rounded p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be a moderator to access AutoMod settings.</p>
          <button
            onClick={() => navigate(`/r/${subreddit}`)}
            className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600"
          >
            Back to r/{subreddit}
          </button>
        </div>
      </div>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────────

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled, lastEditedBy: user!.username, lastEditedAt: new Date() } : r));
    const rule = rules.find((r) => r.id === id);
    toast.success(rule?.enabled ? 'Rule disabled' : 'Rule enabled');
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success('Rule deleted');
  };

  const duplicateRule = (id: string) => {
    const source = rules.find((r) => r.id === id);
    if (!source) return;
    const copy: RichAutoModRule = {
      ...source,
      id: 'rich-' + Math.random().toString(36).substr(2, 9),
      name: source.name + ' (Copy)',
      lastEditedBy: user!.username,
      lastEditedAt: new Date(),
      createdAt: new Date(),
    };
    setRules([...rules, copy]);
    toast.success('Rule duplicated');
  };

  const openNewRule = () => {
    setEditingRule(emptyRule(user!.username));
    setShowEditor(true);
  };

  const openEditRule = (rule: RichAutoModRule) => {
    setEditingRule({ ...rule });
    setShowEditor(true);
  };

  const saveRule = () => {
    if (!editingRule) return;
    if (!editingRule.name.trim()) { toast.error('Rule name is required'); return; }
    if (!editingRule.yamlContent?.trim()) { toast.error('YAML content is required'); return; }
    try {
      yaml.load(editingRule.yamlContent);
    } catch {
      toast.error('YAML is invalid. Please fix syntax before saving.');
      return;
    }

    const updated = { ...editingRule, lastEditedBy: user!.username, lastEditedAt: new Date() };

    if (editingRule.id) {
      // Editing existing
      setRules(rules.map((r) => r.id === editingRule.id ? updated : r));
      toast.success('Rule updated');
    } else {
      // New rule
      updated.id = 'rich-' + Math.random().toString(36).substr(2, 9);
      setRules([...rules, updated]);
      toast.success('Rule created');
    }
    setShowEditor(false);
    setEditingRule(null);
  };

  // ─── Test Engine (Backend API) ─────────────────────────────────────────────────

  const runTests = async () => {
    if (!token) {
      toast.error('You must be logged in to run tests.');
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestRan(true);
    const matches: { rule: string; action: ActionType; message?: string }[] = [];

    const scenario = {
      title: testTitle,
      body: testBody,
      author: testAuthor,
      karma: parseInt(testKarma, 10) || 0,
      accountAge: parseInt(testAge, 10) || 0,
      domain: testDomain || testBody,
      flair: testFlair,
    };

    try {
      if (testMode === 'custom') {
        let yamlDocuments: string[] = [];
        try {
          yamlDocuments = parseCustomYamlDocuments(customTestYaml);
        } catch (parseErr) {
          const message =
            parseErr instanceof Error
              ? parseErr.message
              : 'Custom YAML is invalid. Fix syntax before running test.';
          toast.error(message);
          setTestResults([]);
          setTestLoading(false);
          return;
        }

        const results = await Promise.allSettled(
          yamlDocuments.map(async (docYaml, idx) => {
            const result = await testCustomRule(token, {
              subredditName: subreddit || '',
              ruleYaml: docYaml,
              scenario,
            });
            return { result, idx };
          })
        );

        for (const settled of results) {
          if (settled.status === 'fulfilled') {
            const { result, idx } = settled.value;
            if (result.error) {
              setTestError((prev) =>
                prev
                  ? `${prev}\nCustom Rule ${idx + 1}: ${result.error}`
                  : `Custom Rule ${idx + 1}: ${result.error}`
              );
            } else if (result.triggered) {
              matches.push({
                rule: yamlDocuments.length > 1 ? `Custom Rule ${idx + 1}` : 'Custom Rule',
                action: (result.action || 'flag') as ActionType,
                message: result.message || undefined,
              });
            }
          } else {
            setTestError((prev) =>
              prev ? `${prev}\nFailed to evaluate a custom rule` : 'Failed to evaluate a custom rule'
            );
          }
        }
      } else {
        const enabled = rules.filter((r) => r.enabled);

        const results = await Promise.allSettled(
          enabled.map(async (rule) => {
            const ruleYaml = rule.yamlContent || `type: any\naction: ${rule.action}`;
            const result = await testCustomRule(token, {
              subredditName: subreddit || '',
              ruleYaml,
              scenario,
            });
            return { rule, result };
          })
        );

        for (const settled of results) {
          if (settled.status === 'fulfilled') {
            const { rule, result } = settled.value;
            if (result.error) {
              setTestError((prev) => prev ? `${prev}\n${rule.name}: ${result.error}` : `${rule.name}: ${result.error}`);
            } else if (result.triggered) {
              matches.push({
                rule: rule.name,
                action: (result.action || 'flag') as ActionType,
                message: result.message || rule.messageToUser || undefined,
              });
            }
          } else {
            setTestError((prev) => prev ? `${prev}\nFailed to evaluate a rule` : 'Failed to evaluate a rule');
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to moderation service';
      setTestError(errorMsg);
      toast.error(errorMsg);
    }

    setTestResults(matches);
    setTestLoading(false);
  };

  // ─── Tabs ──────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'rules' as const, label: 'Rules', icon: Shield, count: rules.length },
    { id: 'history' as const, label: 'Rule History', icon: History },
    { id: 'test' as const, label: 'TestPlayground', icon: Terminal },
    { id: 'logs' as const, label: 'Logs', icon: FileText, count: MOCK_LOGS.length },
  ];

  const filteredLogs = logFilter === 'all' ? MOCK_LOGS : MOCK_LOGS.filter((l) => l.status === logFilter);

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white border border-gray-300 rounded mb-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AutoModerator</h1>
              <p className="text-sm text-gray-500">r/{subreddit} &middot; {rules.filter((r) => r.enabled).length} of {rules.length} rules active</p>
            </div>
          </div>
          <Link
            to={`/r/${subreddit}/mod`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Mod Tools
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-300 -mb-6 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── RULES TAB ──────────────────────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <>
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How AutoMod Works</p>
              <p>
                AutoMod scans every post and comment against your YAML rules. Rules run in order, and a single post can trigger multiple actions.
                Use the <strong>TestPlayground</strong> tab before enabling new rules, and follow Reddit syntax from{' '}
                <a
                  href="https://www.reddit.com/r/reddit.com/wiki/automoderator/full-documentation/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  full AutoModerator documentation
                </a>
                .
              </p>
            </div>
          </div>

          {/* Add Rule Button */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">{rules.length} Rule{rules.length !== 1 ? 's' : ''}</h2>
            <button
              onClick={openNewRule}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              Add New Rule
            </button>
          </div>

          {/* Rule Cards */}
          {rules.length === 0 ? (
            <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-1">No rules yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first AutoMod rule to start automatically moderating content.</p>
              <button onClick={openNewRule} className="px-5 py-2 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600">
                Create Rule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const expanded = expandedRule === rule.id;
                const ActionIcon = ACTION_ICONS[rule.action];
                return (
                  <div key={rule.id} className={`bg-white border rounded-lg overflow-hidden transition-colors ${rule.enabled ? 'border-gray-300' : 'border-gray-200 opacity-70'}`}>
                    {/* Summary Row */}
                    <div
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedRule(expanded ? null : rule.id)}
                    >
                      {/* Toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                        className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{rule.name}</span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold ${ACTION_COLORS[rule.action]} bg-gray-100`}>
                            <ActionIcon className="w-3 h-3" />
                            {ACTION_LABELS[rule.action]}
                          </span>
                          {rule.action === 'send_modmail' && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600 font-medium">+ Modmail</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conditionSummary(rule)}
                        </p>
                      </div>

                      <div className="text-xs text-gray-400 hidden sm:block shrink-0">
                        {formatDistanceToNow(rule.lastEditedAt, { addSuffix: true })}
                      </div>

                      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </div>

                    {/* Expanded Details */}
                    {expanded && (
                      <div className="border-t border-gray-200 px-5 py-4 bg-gray-50/50">
                        <div className="mb-4">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> YAML Configuration</div>
                          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{rule.yamlContent || `type: any\naction: ${rule.action}\n# Migrated legacy rule...`}</pre>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-400">
                            Last edited by <span className="font-medium text-gray-600">u/{rule.lastEditedBy}</span> &middot; {format(rule.lastEditedAt, 'MMM d, yyyy h:mm a')}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditRule(rule)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded font-medium"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => duplicateRule(rule.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded font-medium"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => { deleteRule(rule.id); setExpandedRule(null); }}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-bold text-lg">Rule History</h2>
            <p className="text-sm text-gray-500">Recent changes to AutoMod rules</p>
          </div>
          <div className="divide-y divide-gray-100">
            {MOCK_EDIT_HISTORY.map((entry) => (
              <div key={entry.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{entry.ruleName}</span>
                    <span className="px-2 py-0.5 text-[11px] bg-gray-100 rounded text-gray-600">
                      {entry.field === 'new rule' ? 'Created' : `Changed ${entry.field}`}
                    </span>
                  </div>
                  {entry.field !== 'new rule' && entry.field !== 'enabled' && (
                    <div className="text-xs mb-1 space-y-0.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0">&minus;</span>
                        <span className="text-gray-500 line-through break-all">{entry.oldValue}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-green-500 shrink-0">+</span>
                        <span className="text-gray-700 break-all">{entry.newValue}</span>
                      </div>
                    </div>
                  )}
                  {entry.field === 'enabled' && (
                    <p className="text-xs text-gray-500">
                      Changed from <span className="font-medium">{entry.oldValue}</span> to <span className="font-medium">{entry.newValue}</span>
                    </p>
                  )}
                  {entry.field === 'new rule' && (
                    <p className="text-xs text-gray-500">{entry.newValue}</p>
                  )}
                  <div className="text-[11px] text-gray-400 mt-1">
                    by u/{entry.editor} &middot; {format(entry.timestamp, 'MMM d, yyyy h:mm a')} ({formatDistanceToNow(entry.timestamp, { addSuffix: true })})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEST TAB ───────────────────────────────────────────────────────────── */}
      {activeTab === 'test' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-600" />
                  TestPlayground
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setTestMode('saved')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${testMode === 'saved' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Saved Rules</button>
                  <button onClick={() => setTestMode('custom')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${testMode === 'custom' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Write Custom Rule</button>
                </div>
              </div>
              <p className="text-sm text-gray-500">Test content against your AutoMod rules</p>
            </div>
            <div className="p-6">
              
              {testMode === 'custom' && (
                 <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Custom Rule YAML</label>
                  <textarea
                    value={customTestYaml}
                    onChange={(e) => { setCustomTestYaml(e.target.value); setTestRan(false); }}
                    placeholder={`type: any\ntitle (includes): ["test"]\naction: remove`}
                    rows={6}
                    className="w-full px-3 py-2 border border-blue-200 font-mono rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-white"
                  />
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Post Title</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => { setTestTitle(e.target.value); setTestRan(false); }}
                    placeholder="Enter a post title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Author Username</label>
                  <input
                    type="text"
                    value={testAuthor}
                    onChange={(e) => { setTestAuthor(e.target.value); setTestRan(false); }}
                    placeholder="e.g. testUser123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Post / Comment Body</label>
                <textarea
                  value={testBody}
                  onChange={(e) => { setTestBody(e.target.value); setTestRan(false); }}
                  placeholder="Enter post or comment body text..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Karma</label>
                  <input
                    type="number"
                    value={testKarma}
                    onChange={(e) => { setTestKarma(e.target.value); setTestRan(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Age (days)</label>
                  <input
                    type="number"
                    value={testAge}
                    onChange={(e) => { setTestAge(e.target.value); setTestRan(false); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Domain</label>
                  <input
                    type="text"
                    value={testDomain}
                    onChange={(e) => { setTestDomain(e.target.value); setTestRan(false); }}
                    placeholder="e.g. bit.ly"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Post Flair</label>
                  <input
                    type="text"
                    value={testFlair}
                    onChange={(e) => { setTestFlair(e.target.value); setTestRan(false); }}
                    placeholder="e.g. Discussion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={runTests}
                  disabled={testLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {testLoading ? 'Running...' : 'Run Test'}
                </button>
                <span className="text-xs text-gray-400">
                  {testMode === 'saved'
                    ? `Testing against ${rules.filter((r) => r.enabled).length} enabled rule${rules.filter((r) => r.enabled).length !== 1 ? 's' : ''}`
                    : 'Testing against your unsaved custom YAML rule'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testRan && !testLoading && (
            <>
              {testError && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg overflow-hidden px-6 py-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-yellow-700">Warning</span>
                  </div>
                  <p className="text-sm text-yellow-700 whitespace-pre-line">{testError}</p>
                </div>
              )}
              <div className={`border rounded-lg overflow-hidden ${testResults.length > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <div className="px-6 py-4">
                  {testResults.length === 0 ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-bold text-green-700">No Rules Triggered</p>
                        <p className="text-sm text-green-600">This content would pass through all enabled AutoMod rules.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="font-bold text-red-700">{testResults.length} Rule{testResults.length > 1 ? 's' : ''} Triggered</span>
                      </div>
                      <div className="space-y-2">
                        {testResults.map((r, i) => {
                          const Icon = ACTION_ICONS[r.action];
                          return (
                            <div key={i} className="bg-white rounded-lg border border-red-100 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 ${ACTION_COLORS[r.action]}`} />
                                <span className="font-semibold text-sm">{r.rule}</span>
                                <span className={`text-xs font-semibold ${ACTION_COLORS[r.action]}`}>&rarr; {ACTION_LABELS[r.action]}</span>
                              </div>
                              {r.message && (
                                <p className="text-xs text-gray-600 ml-6 bg-gray-50 rounded px-2 py-1 mt-1">
                                  User message: "{r.message.slice(0, 120)}..."
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          {testLoading && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden px-6 py-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm font-medium text-blue-700">Evaluating rules on server...</span>
            </div>
          )}

          {/* Quick Examples */}
          <div className="bg-white border border-gray-300 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Quick Test Examples</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { title: 'CLICK HERE for FREE money!', body: 'Visit this link now!', karma: '500', age: '365' },
                { title: 'How do I fix React hydration?', body: 'I keep getting errors', karma: '5', age: '2' },
                { title: 'Great tutorial!', body: 'Thanks for sharing, this is terrible though', karma: '200', age: '60' },
                { title: 'Check out bit.ly/scam', body: 'Amazing tool at bit.ly/abc123', karma: '10', age: '1' },
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTestTitle(ex.title);
                    setTestBody(ex.body);
                    setTestKarma(ex.karma);
                    setTestAge(ex.age);
                    setTestRan(false);
                    setTestResults([]);
                  }}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 text-gray-600 text-left"
                >
                  <span className="font-medium">{ex.title.slice(0, 35)}</span>
                  <span className="text-gray-400 block">karma: {ex.karma} &middot; age: {ex.age}d</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ───────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">AutoMod Action Log</h2>
              <p className="text-sm text-gray-500">Recent automated actions</p>
            </div>
            <div className="flex gap-1">
              {(['all', 'removed', 'flagged', 'modmailed', 'flair_set'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    logFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'flair_set' ? 'Flair Set' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rule</th>
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Target Content</th>
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Author</th>
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Modmail</th>
                  <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const statusColors: Record<string, string> = {
                    removed: 'bg-red-100 text-red-700',
                    flagged: 'bg-orange-100 text-orange-700',
                    modmailed: 'bg-blue-100 text-blue-700',
                    flair_set: 'bg-teal-100 text-teal-700',
                    approved: 'bg-green-100 text-green-700',
                  };
                  const StatusIcon: Record<string, typeof Shield> = {
                    removed: XCircle,
                    flagged: AlertTriangle,
                    modmailed: Mail,
                    flair_set: Tag,
                    approved: CheckCircle,
                  };
                  const SIcon = StatusIcon[log.status] || AlertTriangle;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${statusColors[log.status] || 'bg-gray-100 text-gray-600'}`}>
                          <SIcon className="w-3 h-3" />
                          {log.status === 'flair_set' ? 'Flair Set' : log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium">{log.rule}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">"{log.target}"</td>
                      <td className="px-5 py-3">
                        <Link to={`/user/${log.author}`} className="text-blue-500 hover:underline">u/{log.author}</Link>
                      </td>
                      <td className="px-5 py-3">
                        {log.modmailSent ? (
                          <span className="inline-flex items-center gap-1 text-blue-500 text-xs"><Mail className="w-3 h-3" /> Sent</span>
                        ) : (
                          <span className="text-gray-300 text-xs">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No log entries match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RULE EDITOR MODAL ──────────────────────────────────────────────────── */}
      {showEditor && editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <h2 className="font-bold text-lg">{editingRule.id ? 'Edit Rule' : 'New AutoMod Rule'}</h2>
              <button onClick={() => { setShowEditor(false); setEditingRule(null); }} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Rule Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g. Spam Keyword Filter"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rule YAML</h3>
                  <label className="cursor-pointer text-blue-500 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Upload .yaml file
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditingRule({ ...editingRule, yamlContent: event.target?.result as string });
                            toast.success('YAML loaded successfully');
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <textarea
                  value={editingRule.yamlContent || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, yamlContent: e.target.value })}
                  placeholder={`---\n# Rule configuration...\ntype: any\naction: remove\n# ...`}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-mono bg-white shadow-inner"
                  spellCheck="false"
                />
                <div className="flex bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
                  <Info className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                  <p>
                    Write your rule in YAML format. Use Reddit AutoModerator syntax, and upload an existing .yaml/.yml file to prefill this editor.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-xl">
              <div className="text-xs text-gray-400">
                {editingRule.id ? `Last edited ${formatDistanceToNow(editingRule.lastEditedAt, { addSuffix: true })}` : 'New rule'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEditor(false); setEditingRule(null); }}
                  className="px-5 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRule}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {editingRule.id ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

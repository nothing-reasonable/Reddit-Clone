import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubreddit } from '../contexts/SubredditContext';
import { subreddits } from '../data/mockData';
import { useState } from 'react';
import {
  Settings, Plus, Trash2, Save, Shield, ArrowLeft, Play, History, FileText,
  Terminal, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  Copy, Pencil, Mail, Lock, Pin, Tag, X, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

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
  return `If ${CONDITION_LABELS[r.conditionField]} ${OPERATOR_LABELS[r.operator]} "${r.value}"`;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────────

function createSeedRules(sub: string): RichAutoModRule[] {
  if (sub === 'programming') {
    return [
      {
        id: 'rich-1',
        name: 'Spam Keyword Filter',
        enabled: true,
        conditionField: 'post_title',
        operator: 'contains',
        value: 'FREE BITCOIN, CLICK HERE, AMAZING OPPORTUNITY, buy now',
        action: 'remove',
        messageToUser: 'Your post in r/{{subreddit}} was automatically removed because it matched our spam filter. If you believe this was a mistake, please contact the moderators.',
        lastEditedBy: 'admin',
        lastEditedAt: new Date('2026-02-26T08:00:00'),
        createdAt: new Date('2026-01-15T10:00:00'),
      },
      {
        id: 'rich-2',
        name: 'Toxic Language Detection',
        enabled: true,
        conditionField: 'post_body',
        operator: 'contains',
        value: 'suck, terrible, horrible, offensive, idiot',
        action: 'flag',
        lastEditedBy: 'moderator',
        lastEditedAt: new Date('2026-02-25T14:00:00'),
        createdAt: new Date('2026-01-15T10:00:00'),
      },
      {
        id: 'rich-3',
        name: 'New Account Review',
        enabled: true,
        conditionField: 'user_age',
        operator: 'less_than',
        value: '7',
        action: 'flag',
        messageToUser: 'Hi {{user.name}}, your post "{{post.title}}" is being held for review because your account is less than 7 days old. A moderator will review it shortly.',
        lastEditedBy: 'admin',
        lastEditedAt: new Date('2026-02-24T09:00:00'),
        createdAt: new Date('2026-02-01T12:00:00'),
      },
      {
        id: 'rich-4',
        name: 'Low Karma Gate',
        enabled: true,
        conditionField: 'account_karma',
        operator: 'less_than',
        value: '50',
        action: 'send_modmail',
        modmailSubject: 'Low-karma post held: {{post.title}}',
        modmailBody: 'User {{user.name}} (karma: {{user.karma}}) submitted a post that was held for review.\n\nPost title: {{post.title}}\n\nPlease review and approve or remove.',
        lastEditedBy: 'techmod',
        lastEditedAt: new Date('2026-02-22T16:00:00'),
        createdAt: new Date('2026-02-10T08:00:00'),
      },
      {
        id: 'rich-5',
        name: 'External Link Screener',
        enabled: false,
        conditionField: 'domain',
        operator: 'contains',
        value: 'bit.ly, tinyurl.com, t.co',
        action: 'remove',
        messageToUser: 'Shortened URLs are not allowed in r/{{subreddit}}. Please resubmit with the full URL.',
        lastEditedBy: 'admin',
        lastEditedAt: new Date('2026-02-20T10:00:00'),
        createdAt: new Date('2026-02-15T11:00:00'),
      },
      {
        id: 'rich-6',
        name: 'Auto-flair Help Requests',
        enabled: true,
        conditionField: 'post_title',
        operator: 'contains',
        value: 'help, how do I, how to, question, beginner',
        action: 'set_flair',
        actionFlair: 'Help',
        lastEditedBy: 'moderator',
        lastEditedAt: new Date('2026-02-23T11:30:00'),
        createdAt: new Date('2026-02-20T09:00:00'),
      },
    ];
  }
  if (sub === 'reactjs') {
    return [
      {
        id: 'rich-r1',
        name: 'Low Karma Filter',
        enabled: true,
        conditionField: 'account_karma',
        operator: 'less_than',
        value: '10',
        action: 'flag',
        lastEditedBy: 'moderator',
        lastEditedAt: new Date('2026-02-25T14:00:00'),
        createdAt: new Date('2026-01-20T10:00:00'),
      },
    ];
  }
  return [];
}

const MOCK_EDIT_HISTORY = [
  { id: 'eh-1', ruleName: 'Spam Keyword Filter', editor: 'admin', field: 'value', oldValue: 'FREE BITCOIN, CLICK HERE', newValue: 'FREE BITCOIN, CLICK HERE, AMAZING OPPORTUNITY, buy now', timestamp: new Date('2026-02-26T08:00:00') },
  { id: 'eh-2', ruleName: 'Auto-flair Help Requests', editor: 'moderator', field: 'new rule', oldValue: '', newValue: 'Created rule', timestamp: new Date('2026-02-23T11:30:00') },
  { id: 'eh-3', ruleName: 'Low Karma Gate', editor: 'techmod', field: 'value', oldValue: '100', newValue: '50', timestamp: new Date('2026-02-22T16:00:00') },
  { id: 'eh-4', ruleName: 'Toxic Language Detection', editor: 'moderator', field: 'value', oldValue: 'suck, terrible', newValue: 'suck, terrible, horrible, offensive, idiot', timestamp: new Date('2026-02-25T14:00:00') },
  { id: 'eh-5', ruleName: 'External Link Screener', editor: 'admin', field: 'enabled', oldValue: 'true', newValue: 'false', timestamp: new Date('2026-02-20T10:00:00') },
  { id: 'eh-6', ruleName: 'Spam Keyword Filter', editor: 'admin', field: 'new rule', oldValue: '', newValue: 'Created initial spam filter', timestamp: new Date('2026-01-15T10:00:00') },
];

const MOCK_LOGS = [
  { id: 'al-1', rule: 'Spam Keyword Filter', action: 'remove' as ActionType, target: 'CLICK HERE FOR FREE BITCOIN!!!', author: 'spamBot123', timestamp: new Date('2026-02-26T08:00:00'), status: 'removed' as const, modmailSent: false },
  { id: 'al-2', rule: 'Toxic Language Detection', action: 'flag' as ActionType, target: 'You all suck at coding', author: 'BadActor99', timestamp: new Date('2026-02-26T06:45:00'), status: 'flagged' as const, modmailSent: false },
  { id: 'al-3', rule: 'Auto-flair Help Requests', action: 'set_flair' as ActionType, target: 'How do I fix useEffect infinite loop?', author: 'newbieDev', timestamp: new Date('2026-02-26T05:30:00'), status: 'flair_set' as const, modmailSent: false },
  { id: 'al-4', rule: 'New Account Review', action: 'flag' as ActionType, target: 'Is React still worth learning in 2026?', author: 'newUser2026', timestamp: new Date('2026-02-25T22:00:00'), status: 'flagged' as const, modmailSent: true },
  { id: 'al-5', rule: 'Low Karma Gate', action: 'send_modmail' as ActionType, target: 'Check out my first project', author: 'freshDev01', timestamp: new Date('2026-02-25T18:00:00'), status: 'modmailed' as const, modmailSent: true },
  { id: 'al-6', rule: 'External Link Screener', action: 'remove' as ActionType, target: 'Amazing tool: bit.ly/3x7hJk', author: 'linkSpammer', timestamp: new Date('2026-02-25T10:30:00'), status: 'removed' as const, modmailSent: false },
  { id: 'al-7', rule: 'Spam Keyword Filter', action: 'remove' as ActionType, target: 'AMAZING OPPORTUNITY - click now!', author: 'scamAccount42', timestamp: new Date('2026-02-25T09:00:00'), status: 'removed' as const, modmailSent: false },
  { id: 'al-8', rule: 'New Account Review', action: 'flag' as ActionType, target: 'Best VS Code extensions for React?', author: 'dayOneUser', timestamp: new Date('2026-02-24T20:00:00'), status: 'flagged' as const, modmailSent: true },
];

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
    lastEditedBy: editor,
    lastEditedAt: new Date(),
    createdAt: new Date(),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AutoModSettings() {
  const { subreddit } = useParams<{ subreddit: string }>();
  const { user } = useAuth();
  const { isModerator: isSubredditModerator } = useSubreddit();
  const navigate = useNavigate();

  const subredditData = subreddits.find((s) => s.name === subreddit);
  const isModerator =
    isSubredditModerator(subreddit || '') ||
    (user?.isModerator && subredditData?.moderators.includes(user.username));

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

  // Logs filter
  const [logFilter, setLogFilter] = useState<'all' | 'removed' | 'flagged' | 'modmailed' | 'flair_set'>('all');

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
    if (!editingRule.value.trim()) { toast.error('Value is required'); return; }

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

  // ─── Test Engine ───────────────────────────────────────────────────────────────

  const runTests = () => {
    setTestRan(true);
    const enabled = rules.filter((r) => r.enabled);
    const matches: { rule: string; action: ActionType; message?: string }[] = [];

    for (const rule of enabled) {
      let fieldValue = '';
      switch (rule.conditionField) {
        case 'post_title': fieldValue = testTitle; break;
        case 'post_body': fieldValue = testBody; break;
        case 'comment_body': fieldValue = testBody; break;
        case 'user_age': fieldValue = testAge; break;
        case 'account_karma': fieldValue = testKarma; break;
        case 'post_flair': fieldValue = testFlair; break;
        case 'domain': fieldValue = testDomain || testBody; break;
        case 'author_name': fieldValue = testAuthor; break;
      }

      let triggered = false;

      if (isNumericCondition(rule.conditionField)) {
        const numVal = parseFloat(fieldValue) || 0;
        const ruleVal = parseFloat(rule.value) || 0;
        if (rule.operator === 'less_than') triggered = numVal < ruleVal;
        else if (rule.operator === 'greater_than') triggered = numVal > ruleVal;
        else if (rule.operator === 'equals') triggered = numVal === ruleVal;
      } else {
        const lower = fieldValue.toLowerCase();
        if (rule.operator === 'contains') {
          const keywords = rule.value.split(',').map((k) => k.trim().toLowerCase());
          triggered = keywords.some((kw) => kw && lower.includes(kw));
        } else if (rule.operator === 'matches') {
          try { triggered = new RegExp(rule.value, 'i').test(fieldValue); } catch { triggered = false; }
        } else if (rule.operator === 'equals') {
          triggered = lower === rule.value.toLowerCase();
        }
      }

      if (triggered) {
        matches.push({ rule: rule.name, action: rule.action, message: rule.messageToUser });
      }
    }
    setTestResults(matches);
  };

  // ─── Tabs ──────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'rules' as const, label: 'Rules', icon: Shield, count: rules.length },
    { id: 'history' as const, label: 'Rule History', icon: History },
    { id: 'test' as const, label: 'Test Rule', icon: Terminal },
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
              <p>AutoMod scans every post and comment against your rules. Matched content is automatically actioned. Rules run in order &mdash; a post can trigger multiple rules. Use the <strong>Test Rule</strong> tab to verify your rules before enabling them.</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Condition</div>
                            <div className="text-sm bg-white border border-gray-200 rounded px-3 py-2">
                              <span className="font-medium text-gray-700">{CONDITION_LABELS[rule.conditionField]}</span>
                              <span className="text-gray-400 mx-1.5">{OPERATOR_LABELS[rule.operator]}</span>
                              <span className="font-mono text-blue-600 break-all">"{rule.value}"</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Action</div>
                            <div className="text-sm bg-white border border-gray-200 rounded px-3 py-2 flex items-center gap-2">
                              <ActionIcon className={`w-4 h-4 ${ACTION_COLORS[rule.action]}`} />
                              <span className={`font-semibold ${ACTION_COLORS[rule.action]}`}>{ACTION_LABELS[rule.action]}</span>
                              {rule.actionFlair && <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Flair: {rule.actionFlair}</span>}
                            </div>
                          </div>
                        </div>

                        {rule.messageToUser && (
                          <div className="mb-4">
                            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Message to User</div>
                            <div className="text-sm bg-white border border-gray-200 rounded px-3 py-2 text-gray-700 whitespace-pre-wrap">
                              {rule.messageToUser}
                            </div>
                          </div>
                        )}

                        {rule.action === 'send_modmail' && rule.modmailSubject && (
                          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-2">Modmail Template</div>
                            <div className="text-sm mb-1">
                              <span className="text-gray-500">Subject:</span>{' '}
                              <span className="font-medium">{rule.modmailSubject}</span>
                            </div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded px-3 py-2 border border-blue-100">
                              {rule.modmailBody}
                            </div>
                          </div>
                        )}

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
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-600" />
                Test Rule
              </h2>
              <p className="text-sm text-gray-500">Paste sample content to see which rules would trigger</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Post Title</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => { setTestTitle(e.target.value); setTestRan(false); }}
                    placeholder="Enter a sample post title"
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
                  placeholder="Enter sample post or comment body text..."
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 text-sm"
                >
                  <Play className="w-4 h-4" />
                  Run Test
                </button>
                <span className="text-xs text-gray-400">
                  Testing against {rules.filter((r) => r.enabled).length} enabled rule{rules.filter((r) => r.enabled).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testRan && (
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

              {/* Condition Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Condition</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Check this field</label>
                    <select
                      value={editingRule.conditionField}
                      onChange={(e) => {
                        const cf = e.target.value as ConditionField;
                        const ops = applicableOperators(cf);
                        setEditingRule({
                          ...editingRule,
                          conditionField: cf,
                          operator: ops.includes(editingRule.operator) ? editingRule.operator : ops[0],
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                    >
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Operator</label>
                    <select
                      value={editingRule.operator}
                      onChange={(e) => setEditingRule({ ...editingRule, operator: e.target.value as Operator })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                    >
                      {applicableOperators(editingRule.conditionField).map((op) => (
                        <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Value <span className="text-red-400">*</span>
                  </label>
                  {isNumericCondition(editingRule.conditionField) ? (
                    <input
                      type="number"
                      value={editingRule.value}
                      onChange={(e) => setEditingRule({ ...editingRule, value: e.target.value })}
                      placeholder={editingRule.conditionField === 'user_age' ? 'e.g. 7 (days)' : 'e.g. 50'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editingRule.value}
                      onChange={(e) => setEditingRule({ ...editingRule, value: e.target.value })}
                      placeholder={
                        editingRule.operator === 'contains'
                          ? 'Comma-separated keywords, e.g. spam, scam, click here'
                          : editingRule.operator === 'matches'
                          ? 'Regex pattern, e.g. \\bfree\\s+money\\b'
                          : 'Exact value'
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  )}
                  {editingRule.operator === 'contains' && !isNumericCondition(editingRule.conditionField) && (
                    <p className="text-[11px] text-gray-400 mt-1">Separate multiple keywords with commas. Case-insensitive.</p>
                  )}
                </div>
              </div>

              {/* Action Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Action</h3>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">When triggered, do this</label>
                  <select
                    value={editingRule.action}
                    onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value as ActionType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
                  >
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Set Flair specific */}
                {editingRule.action === 'set_flair' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Flair to set</label>
                    <input
                      type="text"
                      value={editingRule.actionFlair || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, actionFlair: e.target.value })}
                      placeholder="e.g. Help"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Message to User (optional) */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Message to User <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={editingRule.messageToUser || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, messageToUser: e.target.value })}
                  placeholder="Automated message sent to the user when this rule triggers. You can use variables like {{user.name}}, {{post.title}}, {{subreddit}}."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['{{user.name}}', '{{post.title}}', '{{subreddit}}', '{{user.karma}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, messageToUser: (editingRule.messageToUser || '') + ' ' + v })}
                      className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] font-mono hover:bg-blue-100"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modmail Template (conditional) */}
              {editingRule.action === 'send_modmail' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Modmail Template
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={editingRule.modmailSubject || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, modmailSubject: e.target.value })}
                      placeholder="e.g. AutoMod: Low karma post held - {{post.title}}"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Body</label>
                    <textarea
                      value={editingRule.modmailBody || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, modmailBody: e.target.value })}
                      placeholder="Plain text message body for the modmail notification..."
                      rows={4}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-white"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['{{user.name}}', '{{post.title}}', '{{subreddit}}', '{{user.karma}}', '{{post.url}}'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setEditingRule({ ...editingRule, modmailBody: (editingRule.modmailBody || '') + ' ' + v })}
                          className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[11px] font-mono hover:bg-blue-200"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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

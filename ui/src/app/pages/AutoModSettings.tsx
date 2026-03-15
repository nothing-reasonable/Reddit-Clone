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
import yaml from 'js-yaml';

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

interface ParsedRule {
  action?: string;
  message?: string;
  modmail?: string;
  [key: string]: unknown;
}

interface TestFields {
  title: string;
  body: string;
  karma: string;
  age: string;
  domain: string;
  author: string;
  flair: string;
}

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
  if (sub === 'programming') {
    return [
      {
        id: 'rich-1',
        name: 'Spam Keyword Filter',
        enabled: true,
        yamlContent: 'type: submission\ntitle (includes): ["FREE BITCOIN", "CLICK HERE", "AMAZING OPPORTUNITY", "buy now"]\naction: remove\nmessage: "Your post in r/{{subreddit}} was automatically removed because it matched our spam filter. If you believe this was a mistake, please contact the moderators."',
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
        yamlContent: 'type: any\nbody (includes): ["suck", "terrible", "horrible", "offensive", "idiot"]\naction: filter',
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
        yamlContent: 'type: submission\nauthor:\n  account_age: "< 7 days"\naction: filter\nmessage: "Hi {{author}}, your post is being held for review because your account is less than 7 days old."',
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
        yamlContent: 'type: submission\nauthor:\n  post_karma: "< 50"\naction: filter\nmodmail_subject: "Low-karma post held: {{title}}"\nmodmail: "User {{author}} submitted a post that was held for review.\\n\\nPlease review and approve or remove."',
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
        yamlContent: 'type: link submission\ndomain: ["bit.ly", "tinyurl.com", "t.co"]\naction: remove\nmessage: "Shortened URLs are not allowed in r/{{subreddit}}. Please resubmit with the full URL."',
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
        yamlContent: 'type: submission\ntitle (includes): ["help", "how do I", "how to", "question", "beginner"]\nset_flair: ["Help"]\naction: filter',
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
        yamlContent: 'type: submission\nauthor:\n  post_karma: "< 10"\naction: filter',
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
  { id: 'eh-1', ruleName: 'Spam Keyword Filter', editor: 'admin', field: 'yaml', oldValue: 'title (includes): ["FREE BITCOIN", "CLICK HERE"]', newValue: 'title (includes): ["FREE BITCOIN", "CLICK HERE", "AMAZING OPPORTUNITY", "buy now"]', timestamp: new Date('2026-02-26T08:00:00') },
  { id: 'eh-2', ruleName: 'Auto-flair Help Requests', editor: 'moderator', field: 'new rule', oldValue: '', newValue: 'Created rule', timestamp: new Date('2026-02-23T11:30:00') },
  { id: 'eh-3', ruleName: 'Low Karma Gate', editor: 'techmod', field: 'yaml', oldValue: 'author:\n  post_karma: "< 100"', newValue: 'author:\n  post_karma: "< 50"', timestamp: new Date('2026-02-22T16:00:00') },
  { id: 'eh-4', ruleName: 'Toxic Language Detection', editor: 'moderator', field: 'yaml', oldValue: 'body (includes): ["suck", "terrible"]', newValue: 'body (includes): ["suck", "terrible", "horrible", "offensive", "idiot"]', timestamp: new Date('2026-02-25T14:00:00') },
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
    yamlContent: '---\n# Write your AutoModerator rule here in YAML\ntype: any\naction: flag\n# ...\n',
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
  
  const [testMode, setTestMode] = useState<'saved' | 'custom'>('saved');
  const [customTestYaml, setCustomTestYaml] = useState('type: any\ntitle (includes): ["test"]\naction: remove');

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

  // ─── Test Engine ───────────────────────────────────────────────────────────────

  const parseThreshold = (raw: unknown): number | null => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw !== 'string') return null;
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };

  const includesAny = (source: string, patterns: unknown): boolean => {
    if (!Array.isArray(patterns)) return false;
    const haystack = source.toLowerCase();
    return patterns.some((v) => typeof v === 'string' && haystack.includes(v.toLowerCase()));
  };

  const evaluateYamlRule = (yamlContent: string, fields: TestFields) => {
    try {
      const parsed = typeof yamlContent === 'string' ? yaml.load(yamlContent) : yamlContent;
      if (!parsed || typeof parsed !== 'object') return null;

      const p = parsed as ParsedRule;
      let triggered = false;
      let action: ActionType = 'flag';

      if (p.action === 'remove') action = 'remove';
      if (p.action === 'approve') action = 'approve';
      if (p.action === 'filter') action = 'flag';

      if (Array.isArray(p.set_flair)) action = 'set_flair';
      if (typeof p.modmail === 'string' || typeof p.modmail_subject === 'string') action = 'send_modmail';

      if (includesAny(fields.title, p['title (includes)'])) {
        triggered = true;
      } else if (includesAny(fields.body, p['body (includes)'])) {
        triggered = true;
      } else if (typeof p['title (regex)'] === 'string') {
        try {
          triggered = new RegExp(p['title (regex)'], 'i').test(fields.title);
        } catch {
          triggered = false;
        }
      } else if (typeof p['body (regex)'] === 'string') {
        try {
          triggered = new RegExp(p['body (regex)'], 'i').test(fields.body);
        } catch {
          triggered = false;
        }
      } else if (Array.isArray(p.domain)) {
        triggered = includesAny(fields.domain, p.domain);
      } else if (typeof p.flair_text === 'string') {
        triggered = fields.flair.toLowerCase() === p.flair_text.toLowerCase();
      } else if (typeof p.author === 'object' && p.author) {
        const authorBlock = p.author as Record<string, unknown>;
        const ageThreshold = parseThreshold(authorBlock.account_age);
        const karmaThreshold = parseThreshold(authorBlock.post_karma);
        if (ageThreshold !== null) {
          triggered = (parseFloat(fields.age) || 0) < ageThreshold;
        } else if (karmaThreshold !== null) {
          triggered = (parseFloat(fields.karma) || 0) < karmaThreshold;
        }
      }

      if (triggered) {
        const parsedMessage =
          typeof p.message === 'string'
            ? p.message
            : typeof p.modmail === 'string'
              ? p.modmail
              : undefined;
        return { action, message: parsedMessage };
      }
    } catch {
      return null;
    }
    return null;
  };

  const runTests = () => {
    setTestRan(true);
    const matches: { rule: string; action: ActionType; message?: string }[] = [];
    
    const fields = {
      title: testTitle,
      body: testBody,
      karma: testKarma,
      age: testAge,
      domain: testDomain || testBody,
      author: testAuthor,
      flair: testFlair,
    };

    if (testMode === 'custom') {
      try {
        yaml.load(customTestYaml);
      } catch {
        toast.error('Custom YAML is invalid. Fix syntax before running test.');
        setTestResults([]);
        return;
      }
      const result = evaluateYamlRule(customTestYaml, fields);
      if (result) {
         matches.push({ rule: 'Custom Rule', action: result.action, message: result.message });
      }
    } else {
      const enabled = rules.filter((r) => r.enabled);

      for (const rule of enabled) {
        if (rule.yamlContent) {
           const result = evaluateYamlRule(rule.yamlContent, fields);
           if (result) {
              matches.push({ rule: rule.name, action: result.action, message: result.message || rule.messageToUser });
           }
        } else {
           // Fallback to old logic
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
      }
    }
    setTestResults(matches);
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
              <p className="text-sm text-gray-500">Paste sample content to see which rules would trigger</p>
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
                  {testMode === 'saved'
                    ? `Testing against ${rules.filter((r) => r.enabled).length} enabled rule${rules.filter((r) => r.enabled).length !== 1 ? 's' : ''}`
                    : 'Testing against your unsaved custom YAML rule'}
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

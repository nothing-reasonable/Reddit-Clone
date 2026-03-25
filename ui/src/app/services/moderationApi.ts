const MODERATION_SERVICE_URL = 'http://localhost:8084';

export interface ModQueueItem {
  id: string;
  postId?: string;
  type: string;
  status: string;
  flagReason: string;
  reportCount: number;
  contentTitle: string;
  contentBody: string;
  author: string;
}

interface ModQueueResponse {
  content: ModQueueItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export async function getModQueue(token: string, subreddit: string): Promise<ModQueueItem[]> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/modqueue`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Failed to fetch mod queue (${response.status})`);
  const data = (await response.json()) as ModQueueResponse;
  return data.content ?? [];
}

export async function approveModItem(token: string, subreddit: string, itemId: string, type?: 'post' | 'comment', postId?: string): Promise<void> {
  let url: string;
  
  if (type === 'comment' && postId) {
    url = `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/${encodeURIComponent(postId)}/comments/${encodeURIComponent(itemId)}/approve`;
  } else {
    url = `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/${encodeURIComponent(itemId)}/approve`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Failed to approve item (${response.status})`);
}

export async function removeModItem(token: string, subreddit: string, itemId: string, type?: 'post' | 'comment', postId?: string): Promise<void> {
  let url: string;
  
  if (type === 'comment' && postId) {
    url = `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/${encodeURIComponent(postId)}/comments/${encodeURIComponent(itemId)}/remove`;
  } else {
    url = `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/${encodeURIComponent(itemId)}/remove`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Failed to remove item (${response.status})`);
}

export interface TestScenario {
  type?: string;
  id?: string;
  url?: string;
  title: string;
  body: string;
  author: string;
  karma: number;
  postKarma?: number;
  commentKarma?: number;
  accountAge: number;
  domain: string;
  flair: string;
  flairCssClass?: string;
  reports?: number;
  isEdited?: boolean;
  isTopLevel?: boolean;
  isModerator?: boolean;
  isContributor?: boolean;
  isSubmitter?: boolean;
  isGold?: boolean;
  parentSubmission?: Record<string, unknown>;
  mediaEmbed?: Record<string, unknown>;
  secureMediaEmbed?: Record<string, unknown>;
  mediaAuthor?: string;
  mediaAuthorUrl?: string;
  mediaTitle?: string;
  mediaDescription?: string;
}

export interface TestPlaygroundRequest {
  subredditName: string;
  ruleYaml: string;
  scenario: TestScenario;
}

export interface TestPlaygroundResponse {
  triggered: boolean;
  action: string | null;
  message: string | null;
  error: string | null;
}

export interface ModLogEntryDto {
  id: string;
  subreddit: string;
  moderator: string;
  action: string;
  targetContent?: string;
  targetUser?: string;
  timestamp: string;
}

export async function getModLog(token: string, subreddit: string): Promise<import('../types/domain').ModLogEntry[]> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/log`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Failed to fetch mod log (${response.status})`);
  const responseData = await response.json() as { data: ModLogEntryDto[] };
  const data = responseData.data || [];
  return data.map((entry) => ({
    id: entry.id,
    subreddit: entry.subreddit,
    moderator: entry.moderator,
    action: entry.action,
    targetContent: entry.targetContent,
    targetUser: entry.targetUser,
    timestamp: new Date(entry.timestamp),
  }));
}

export async function testCustomRule(
  token: string,
  request: TestPlaygroundRequest
): Promise<TestPlaygroundResponse> {
  const response = await fetch(`${MODERATION_SERVICE_URL}/api/moderation/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    // Backend returns TestPlaygroundResponse with error field on 400
    if (data.error) {
      return data as TestPlaygroundResponse;
    }
    throw new Error(data.message || `Server error: ${response.status}`);
  }

  return data as TestPlaygroundResponse;
}

// ─── AutoMod Rule CRUD ────────────────────────────────────────────────────────

export interface AutoModRuleDto {
  id: string;
  subredditName: string;
  name: string;
  enabled: boolean;
  priority: number;
  moderatorsExempt: boolean;
  yamlContent: string;
  lastEditedBy: string;
  lastEditedAt: string;
  createdAt: string;
}

export async function getAutoModRules(token: string, subreddit: string): Promise<AutoModRuleDto[]> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/rules`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Failed to fetch AutoMod rules (${response.status})`);
  const data = await response.json() as { data: AutoModRuleDto[] };
  return data.data ?? [];
}

export async function createAutoModRule(
  token: string,
  subreddit: string,
  rule: { name: string; enabled: boolean; priority: number; moderatorsExempt: boolean; yamlContent: string }
): Promise<AutoModRuleDto> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/rules`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(rule),
    }
  );
  if (!response.ok) throw new Error(`Failed to create AutoMod rule (${response.status})`);
  return response.json() as Promise<AutoModRuleDto>;
}

export async function updateAutoModRule(
  token: string,
  subreddit: string,
  ruleId: string,
  rule: { name: string; enabled: boolean; priority: number; moderatorsExempt: boolean; yamlContent: string }
): Promise<AutoModRuleDto> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/rules/${ruleId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(rule),
    }
  );
  if (!response.ok) throw new Error(`Failed to update AutoMod rule (${response.status})`);
  return response.json() as Promise<AutoModRuleDto>;
}

export async function toggleAutoModRule(token: string, subreddit: string, ruleId: string, enabled: boolean): Promise<void> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/rules/${ruleId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled }),
    }
  );
  if (!response.ok) throw new Error(`Failed to toggle AutoMod rule (${response.status})`);
}

export async function deleteAutoModRule(token: string, subreddit: string, ruleId: string): Promise<void> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/rules/${ruleId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Failed to delete AutoMod rule (${response.status})`);
}

export interface AutoModHistoryEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  action: string;
  moderator: string;
  timestamp: string;
  changes?: Record<string, unknown>;
}

export interface AutoModHistoryResponse {
  data: AutoModHistoryEntry[];
}

export async function getAutoModHistory(token: string, subreddit: string): Promise<AutoModHistoryEntry[]> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/v1/r/${encodeURIComponent(subreddit)}/automod/history`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Failed to fetch AutoMod history (${response.status})`);
  const data = await response.json() as AutoModHistoryResponse;
  return data.data ?? [];
}

// ─── Direct Post Mod Actions (used from PostDetail) ───────────────────────────

async function postModAction(token: string, subreddit: string, postId: string, action: string): Promise<void> {
  const response = await fetch(
    `${MODERATION_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/mod-actions/${encodeURIComponent(postId)}/${action}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Mod action '${action}' failed (${response.status})`);
}

export const lockPost    = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'lock');
export const unlockPost  = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'unlock');
export const pinPost     = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'pin');
export const unpinPost   = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'unpin');
export const removePost  = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'remove');
export const restorePost = (token: string, subreddit: string, postId: string) => postModAction(token, subreddit, postId, 'approve');

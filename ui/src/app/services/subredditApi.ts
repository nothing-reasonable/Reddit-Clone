import type { Subreddit, SubredditRule } from '../types/domain';

const SUBREDDIT_SERVICE_URL = '';

export type CommunityType = 'public' | 'restricted' | 'private';

interface ApiError {
  message?: string;
  [key: string]: unknown;
}

interface SubredditRuleDto {
  id?: number;
  title: string;
  description?: string;
}

interface SubredditDto {
  id: number;
  name: string;
  description?: string;
  longDescription?: string;
  type?: string;
  isNsfw?: boolean;
  bannerUrl?: string;
  iconUrl?: string;
  creatorUsername?: string;
  archived?: boolean;
  memberCount?: number;
  onlineCount?: number;
  rules?: SubredditRuleDto[];
  flairs?: string[];
  moderators?: string[];
  createdAt?: string;
}

interface CreateSubredditRequest {
  name: string;
  description: string;
  type: string;
  isNsfw: boolean;
}

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200';
const DEFAULT_ICON = 'r/';
export const PRESENCE_SESSION_STORAGE_KEY = 'presence_session_id';

export function getPresenceSessionId(): string {
  const existing = window.sessionStorage.getItem(PRESENCE_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(PRESENCE_SESSION_STORAGE_KEY, random);
  return random;
}

function mapRules(rules: SubredditRuleDto[] | undefined): SubredditRule[] {
  if (!rules) return [];
  return rules.map((rule, idx) => ({
    id: String(rule.id ?? idx + 1),
    title: rule.title,
    description: rule.description ?? '',
  }));
}

function mapToSubreddit(dto: SubredditDto): Subreddit {
  const members = dto.memberCount ?? 0;
  const estimatedOnline = members > 0 ? Math.max(1, Math.floor(members * 0.01)) : 0;
  const online = typeof dto.onlineCount === 'number' ? dto.onlineCount : estimatedOnline;

  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? 'No description yet.',
    longDescription: dto.longDescription ?? dto.description ?? 'No description yet.',
    members,
    online,
    icon: DEFAULT_ICON,
    banner: dto.bannerUrl && dto.bannerUrl.trim() ? dto.bannerUrl : DEFAULT_BANNER,
    moderators: dto.moderators ?? [],
    rules: mapRules(dto.rules),
    flairs: dto.flairs ?? [],
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    isNSFW: dto.isNsfw ?? false,
    archived: dto.archived ?? false,
  };
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    if (data.message) return data.message;

    // Validation errors arrive as { field: message }
    const messages = Object.values(data).filter((v) => typeof v === 'string') as string[];
    if (messages.length > 0) return messages[0];
  } catch {
    // Fall through to status text message.
  }

  return `Request failed (${response.status})`;
}

export async function getSubredditByName(name: string): Promise<Subreddit | null> {
  const response = await fetch(`${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(name)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const dto = (await response.json()) as SubredditDto;
  return mapToSubreddit(dto);
}

export async function getAllSubreddits(): Promise<Subreddit[]> {
  const response = await fetch(`${SUBREDDIT_SERVICE_URL}/api/subreddits`);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const dtos = (await response.json()) as SubredditDto[];
  return dtos.map(mapToSubreddit);
}

export async function createSubreddit(
  token: string,
  payload: { name: string; description: string; communityType: CommunityType; isNsfw: boolean }
): Promise<Subreddit> {
  const requestBody: CreateSubredditRequest = {
    name: payload.name,
    description: payload.description,
    type: payload.communityType,
    isNsfw: payload.isNsfw,
  };

  const response = await fetch(`${SUBREDDIT_SERVICE_URL}/api/subreddits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const dto = (await response.json()) as SubredditDto;
  return mapToSubreddit(dto);
}

export async function joinSubredditMembership(token: string, subredditName: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/join`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function leaveSubredditMembership(token: string, subredditName: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/join`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function resignModeratorRole(token: string, subredditName: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/moderator/resign`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function requestSubredditTakeover(token: string, subredditName: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/takeover-requests`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function heartbeatSubredditPresence(token: string, subredditName: string): Promise<number> {
  const presenceSessionId = getPresenceSessionId();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-Presence-Session': presenceSessionId,
  };

  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/presence`,
    {
      method: 'POST',
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const onlineCount = (await response.json()) as number;
  return Number.isFinite(onlineCount) ? onlineCount : 0;
}

export async function leaveSubredditPresence(token: string, subredditName: string): Promise<number> {
  const presenceSessionId = getPresenceSessionId();
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/presence`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Presence-Session': presenceSessionId,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const onlineCount = (await response.json()) as number;
  return Number.isFinite(onlineCount) ? onlineCount : 0;
}

interface SubredditMemberDto {
  id: number;
  username: string;
  subredditId: number;
  role: 'MEMBER' | 'MODERATOR';
  joinedAt: string;
}

export async function getUserCommunities(token: string): Promise<SubredditMemberDto[]> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/user/communities`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as SubredditMemberDto[];
}

// ─── Ban management ───────────────────────────────────────────────────────────

export interface BannedMemberDto {
  id: number;
  username: string;
  bannedBy: string;
  reason: string;
  permanent: boolean;
  expiresAt?: string;
  bannedAt: string;
}

export async function getBannedUsers(token: string, subredditName: string): Promise<BannedMemberDto[]> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/bans`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return (await response.json()) as BannedMemberDto[];
}

export async function banUser(
  token: string,
  subredditName: string,
  payload: { username: string; reason: string; permanent: boolean; durationDays?: number }
): Promise<BannedMemberDto> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/bans`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) throw new Error(await parseApiError(response));
  return (await response.json()) as BannedMemberDto;
}

export async function unbanUser(token: string, subredditName: string, username: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/bans/${encodeURIComponent(username)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(await parseApiError(response));
}

export interface ModeratorApplicationDto {
  id: number;
  requesterUsername: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export async function requestModeratorApplication(token: string, subredditName: string): Promise<void> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/moderator-applications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function getPendingModeratorApplications(
  token: string,
  subredditName: string
): Promise<ModeratorApplicationDto[]> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/moderator-applications`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as ModeratorApplicationDto[];
}

export async function hasPendingModeratorApplication(
  token: string,
  subredditName: string
): Promise<boolean> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/moderator-applications/pending`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as boolean;
}

export async function resolveModeratorApplication(
  token: string,
  subredditName: string,
  requestId: number,
  decision: 'approve' | 'reject'
): Promise<ModeratorApplicationDto> {
  const response = await fetch(
    `${SUBREDDIT_SERVICE_URL}/api/subreddits/${encodeURIComponent(subredditName)}/moderator-applications/${requestId}/${decision}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as ModeratorApplicationDto;
}

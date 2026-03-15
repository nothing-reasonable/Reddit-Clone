import type { Subreddit, SubredditRule } from '../types/domain';

const SUBREDDIT_SERVICE_URL = 'http://localhost:8082';

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
  memberCount?: number;
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

  return {
    name: dto.name,
    description: dto.description ?? 'No description yet.',
    longDescription: dto.longDescription ?? dto.description ?? 'No description yet.',
    members,
    online: estimatedOnline,
    icon: DEFAULT_ICON,
    banner: dto.bannerUrl && dto.bannerUrl.trim() ? dto.bannerUrl : DEFAULT_BANNER,
    moderators: dto.moderators ?? [],
    rules: mapRules(dto.rules),
    flairs: dto.flairs ?? [],
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    isNSFW: dto.isNsfw ?? false,
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

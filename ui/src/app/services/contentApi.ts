import type { Post } from '../types/domain';

const CONTENT_SERVICE_URL = 'http://localhost:8083';

interface ContentPostDto {
  id: string;
  subreddit: string;
  author: string;
  title: string;
  content?: string;
  type: string;
  url?: string;
  upvotes?: number;
  downvotes?: number;
  commentCount?: number;
  createdAt?: string;
  flair?: string;
  flagged?: boolean;
  removed?: boolean;
  locked?: boolean;
  pinned?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    after: string | null;
    count: number;
    hasMore: boolean;
  };
}

interface ApiError {
  message?: string;
  [key: string]: unknown;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    if (data.message) {
      return data.message;
    }
  } catch {
    // fall through
  }
  return `Request failed (${response.status})`;
}

function mapPost(dto: ContentPostDto): Post {
  return {
    id: dto.id,
    subreddit: dto.subreddit,
    author: dto.author,
    title: dto.title,
    content: dto.content ?? '',
    type: (dto.type?.toLowerCase() ?? 'text') as Post['type'],
    url: dto.url,
    upvotes: dto.upvotes ?? 0,
    downvotes: dto.downvotes ?? 0,
    commentCount: dto.commentCount ?? 0,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    flair: dto.flair,
    flagged: dto.flagged ?? false,
    removed: dto.removed ?? false,
    locked: dto.locked ?? false,
    pinned: dto.pinned ?? false,
    awards: [],
  };
}

export async function getGlobalPosts(sortBy: 'hot' | 'new' | 'top' | 'rising' = 'hot'): Promise<Post[]> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts?sort=${encodeURIComponent(sortBy)}&limit=50`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts (${response.status})`);
  }

  const payload = (await response.json()) as PaginatedResponse<ContentPostDto>;
  return (payload.data ?? []).map(mapPost).filter((p) => !p.removed);
}

export async function getSubredditPosts(
  subreddit: string,
  sortBy: 'hot' | 'new' | 'top' | 'rising' = 'hot'
): Promise<Post[]> {
  const response = await fetch(
    `${CONTENT_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/posts?sort=${encodeURIComponent(sortBy)}&limit=50`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch subreddit posts (${response.status})`);
  }

  const payload = (await response.json()) as PaginatedResponse<ContentPostDto>;
  return (payload.data ?? []).map(mapPost).filter((p) => !p.removed);
}

export async function getPostById(postId: string): Promise<Post | null> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch post (${response.status})`);
  }

  const dto = (await response.json()) as ContentPostDto;
  if (dto.removed) return null;
  return mapPost(dto);
}

export async function reportPost(token: string, postId: string): Promise<void> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to report post (${response.status})`);
  }
}

export async function createPost(
  token: string,
  subreddit: string,
  payload: { title: string; content?: string; type: 'text' | 'link' | 'image' | 'poll'; url?: string; flair?: string }
): Promise<Post> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/r/${encodeURIComponent(subreddit)}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: payload.title,
      content: payload.content,
      type: payload.type,
      url: payload.url,
      flair: payload.flair,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const dto = (await response.json()) as ContentPostDto;
  return mapPost(dto);
}

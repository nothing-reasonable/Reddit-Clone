import type { Comment } from '../types/domain';

const CONTENT_SERVICE_URL = 'http://localhost:8083';

interface CommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  editedAt: string | null;
  removed: boolean;
  flagged: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    after: string | null;
    count: number;
    hasMore: boolean;
  };
}

function mapComment(dto: CommentDto): Comment {
  return {
    id: dto.id,
    postId: dto.postId,
    parentId: dto.parentId || undefined,
    author: dto.author,
    content: dto.removed ? '[removed]' : dto.content,
    upvotes: dto.upvotes,
    downvotes: dto.downvotes,
    createdAt: new Date(dto.createdAt),
    removed: dto.removed,
    flagged: dto.flagged,
  };
}

export async function getComments(postId: string, page = 0, limit = 50): Promise<Comment[]> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}/comments?page=${page}&limit=${limit}`);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch comments (${response.status})`);
  }
  const payload = (await response.json()) as PaginatedResponse<CommentDto>;
  return (payload.data ?? []).map(mapComment);
}

export async function createComment(
  token: string,
  postId: string,
  content: string,
  parentId?: string
): Promise<Comment> {
  console.log('[DEBUG] Creating comment:', { postId, content, parentId, token: token ? 'present' : 'missing' });
  
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      parentId: parentId || null,
    }),
  });

  console.log('[DEBUG] Response status:', response.status);

  if (!response.ok) {
    let errorMessage = `Failed to create comment (${response.status})`;
    try {
      const errorData = await response.json();
      console.error('[DEBUG] Error response:', errorData);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      const text = await response.text();
      console.error('[DEBUG] Error response text:', text);
    }
    throw new Error(errorMessage);
  }

  const dto = (await response.json()) as CommentDto;
  return mapComment(dto);
}

export async function deleteComment(token: string, postId: string, commentId: string): Promise<void> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete comment (${response.status})`);
  }
}

export async function voteComment(token: string, postId: string, commentId: string, direction: -1 | 0 | 1): Promise<number> {
  const response = await fetch(`${CONTENT_SERVICE_URL}/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/votes`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ direction }),
  });

  if (!response.ok) {
    throw new Error(`Failed to vote on comment (${response.status})`);
  }

  const payload = (await response.json()) as { score: number };
  return payload.score;
}

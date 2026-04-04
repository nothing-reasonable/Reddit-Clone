const MODMAIL_SERVICE_URL = '';

interface ApiError {
  message?: string;
  [key: string]: unknown;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    return data.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export interface ModMailThreadDto {
  id: number;
  subredditName: string;
  username: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
  lastMessagePreview: string;
}

export interface ModMailMessageDto {
  id: number;
  senderType: 'USER' | 'MODERATOR' | 'AUTOMOD' | string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

export async function getUserModMailThreads(token: string): Promise<ModMailThreadDto[]> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/users/threads`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function getSubredditModMailThreads(token: string, subreddit: string): Promise<ModMailThreadDto[]> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/subreddits/${encodeURIComponent(subreddit)}/threads`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function getThreadMessages(token: string, threadId: number): Promise<ModMailMessageDto[]> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function sendThreadMessage(token: string, threadId: number, body: string): Promise<ModMailMessageDto> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function markThreadRead(token: string, threadId: number): Promise<void> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/threads/${threadId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function createModMailThread(
  token: string,
  subredditName: string,
  username: string,
  subject: string,
  body: string
): Promise<ModMailThreadDto> {
  const response = await fetch(`${MODMAIL_SERVICE_URL}/api/modmail/threads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ subredditName, username, subject, body })
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

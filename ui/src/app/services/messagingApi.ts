const MESSAGING_SERVICE_URL = 'http://localhost:8085';

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

export interface MessageDto {
  id: number;
  senderType: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

export interface ConversationDto {
  id: number;
  otherUser: string;
  username: string;
  status: string;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
}

export async function getUserConversations(token: string): Promise<ConversationDto[]> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/conversations`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function getConversationMessages(token: string, conversationId: string): Promise<MessageDto[]> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function sendMessage(token: string, conversationId: string, text: string): Promise<MessageDto> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ body: text })
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function createConversation(token: string, recipientName: string, body: string, actingAsSubreddit?: string): Promise<ConversationDto> {
  const payload: any = { recipientName, body };
  if (actingAsSubreddit) payload.actingAsSubreddit = actingAsSubreddit;

  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function createApplication(token: string, subreddit: string): Promise<ConversationDto> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ subreddit })
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function acceptApplication(token: string, conversationId: string): Promise<void> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/applications/${conversationId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function rejectApplication(token: string, conversationId: string): Promise<void> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/applications/${conversationId}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function closeConversation(token: string, conversationId: string): Promise<void> {
  const response = await fetch(`${MESSAGING_SERVICE_URL}/api/messages/conversations/${conversationId}/close`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

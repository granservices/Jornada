import { apiFetch } from '../api/api-client';

export type ChatTeamCode =
  | 'OPERATIONS'
  | 'MEDICINE'
  | 'TRAINING'
  | 'TI'
  | 'SUPPORT';

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'SECTOR' | 'TEAM' | 'SYSTEM' | 'EXTERNAL';
  senderName: string;
  body: string;
  clientMessageId: string | null;
  mine: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type ChatConversation = {
  id: string;
  sector: ChatTeamCode | null;
  teamCode: ChatTeamCode | string | null;
  teamName: string;
  sectorLabel: string;
  title: string;
  status: 'OPEN' | 'ARCHIVED';
  unreadCount: number;
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  updatedAt: string;
};

export type ChatConversationsResponse = {
  items: ChatConversation[];
};

export type ChatMessagesResponse = {
  items: ChatMessage[];
  nextCursor: string | null;
};

export type SendChatMessageResponse = {
  message: ChatMessage;
  conversation: ChatConversation;
};

export type ChatConversationFilter = 'all' | 'unread' | ChatTeamCode;

export function listChatConversations(params: {
  filter: ChatConversationFilter;
  q: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.filter === 'unread') {
    searchParams.set('unread', 'true');
  } else if (params.filter !== 'all') {
    searchParams.set('teamCode', params.filter);
  }

  const query = params.q.trim();
  if (query) {
    searchParams.set('q', query);
  }

  searchParams.set('limit', '20');

  return apiFetch<ChatConversationsResponse>(
    `/chat/conversations?${searchParams.toString()}`,
  );
}

export function listChatMessages(params: {
  conversationId: string;
  cursor?: string | null;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', '30');

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  return apiFetch<ChatMessagesResponse>(
    `/chat/conversations/${params.conversationId}/messages?${searchParams.toString()}`,
  );
}

export function sendChatMessage(params: {
  conversationId: string;
  body: string;
  clientMessageId: string;
}) {
  return apiFetch<SendChatMessageResponse>(
    `/chat/conversations/${params.conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        body: params.body,
        clientMessageId: params.clientMessageId,
      }),
    },
  );
}

export function markChatConversationRead(conversationId: string) {
  return apiFetch<{ ok: true }>(`/chat/conversations/${conversationId}/read`, {
    method: 'POST',
  });
}

export type ChatConversationRoom = `chat:conversation:${string}`;
export type ChatUserRoom = `chat:user:${string}`;

export function chatConversationRoom(
  conversationId: string,
): ChatConversationRoom {
  return `chat:conversation:${conversationId}`;
}

export function chatUserRoom(userId: string): ChatUserRoom {
  return `chat:user:${userId}`;
}

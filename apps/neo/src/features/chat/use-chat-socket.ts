import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { getRealtimeBaseUrl } from '../api/api-client';
import { useAuthSession } from '../auth/use-auth-session';
import type { ChatMessage } from './chat-api';

export function useChatSocket(selectedConversationId: string | null) {
  const session = useAuthSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.accessToken) {
      return undefined;
    }

    const socket = io(`${getRealtimeBaseUrl()}/chat`, {
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      if (selectedConversationId) {
        socket.emit('chat:join', { conversationId: selectedConversationId });
      }
    });

    socket.on('chat:conversation.updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    });

    socket.on('chat:message.created', (message: ChatMessage) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', message.conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, selectedConversationId, session?.accessToken]);
}

import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  chatConversationRoom,
  chatUserRoom,
} from './chat.types';

@Injectable()
export class ChatRealtimeService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  emitMessage(conversationId: string, message: unknown) {
    this.server
      ?.to(chatConversationRoom(conversationId))
      .emit('chat:message.created', message);
  }

  emitConversationUpdated(userId: string, conversation: unknown) {
    this.server
      ?.to(chatUserRoom(userId))
      .emit('chat:conversation.updated', conversation);
  }

  emitTyping(conversationId: string, payload: unknown, senderSocketId: string) {
    this.server
      ?.to(chatConversationRoom(conversationId))
      .except(senderSocketId)
      .emit('chat:typing', payload);
  }
}

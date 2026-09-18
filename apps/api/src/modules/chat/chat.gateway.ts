import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import {
  chatConversationRoom,
  chatUserRoom,
} from './chat.types';

type JoinPayload = {
  conversationId?: string;
};

type TypingPayload = {
  conversationId?: string;
  isTyping?: boolean;
};

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
})
export class ChatGateway {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtAccessTokenService: JwtAccessTokenService,
    private readonly chatService: ChatService,
    private readonly chatRealtimeService: ChatRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.chatRealtimeService.bindServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.getClientToken(client);
      const user = await this.jwtAccessTokenService.verifyToken(token);
      client.data.user = user;
      await client.join(chatUserRoom(user.id));

      const conversationIds = await this.chatService.listConversationIdsForUser(
        user.id,
      );
      await Promise.all(
        conversationIds.map((conversationId) =>
          client.join(chatConversationRoom(conversationId)),
        ),
      );
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:join')
  async joinConversation(client: Socket, @MessageBody() payload: JoinPayload) {
    const user = this.getAuthenticatedSocketUser(client);

    if (!payload.conversationId) {
      throw new WsException('conversationId obrigatorio.');
    }

    await this.chatService.assertConversationAccess(
      user.id,
      payload.conversationId,
    );
    await client.join(chatConversationRoom(payload.conversationId));

    return { ok: true };
  }

  @SubscribeMessage('chat:typing')
  async typing(client: Socket, @MessageBody() payload: TypingPayload) {
    const user = this.getAuthenticatedSocketUser(client);

    if (!payload.conversationId) {
      throw new WsException('conversationId obrigatorio.');
    }

    await this.chatService.assertConversationAccess(
      user.id,
      payload.conversationId,
    );

    this.chatRealtimeService.emitTyping(
      payload.conversationId,
      {
        conversationId: payload.conversationId,
        userId: user.id,
        isTyping: payload.isTyping ?? true,
      },
      client.id,
    );

    return { ok: true };
  }

  private getClientToken(client: Socket) {
    const authToken = client.handshake.auth.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;
    const header = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    const [scheme, token] = header?.split(' ') ?? [];

    if (scheme === 'Bearer' && token) {
      return token;
    }

    throw new WsException('Token de acesso obrigatorio.');
  }

  private getAuthenticatedSocketUser(client: Socket) {
    const user = client.data.user;

    if (!user || typeof user.id !== 'string') {
      throw new WsException('Socket nao autenticado.');
    }

    return user as { id: string };
  }
}

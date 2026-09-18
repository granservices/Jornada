import { Module } from '@nestjs/common';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { PrismaModule } from '../../database/prisma.module';
import { JornadaChatIdentityAdapter } from './adapters/jornada-chat-identity.adapter';
import { NoopSupportNotificationAdapter } from './adapters/noop-support-notification.adapter';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { CHAT_IDENTITY_PORT } from './ports/chat-identity.port';
import { SUPPORT_NOTIFICATION_PORT } from './ports/support-notification.port';
import { SupportTeamDirectoryService } from './support-team-directory.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatRealtimeService,
    ChatService,
    SupportTeamDirectoryService,
    JwtAccessTokenService,
    JornadaChatIdentityAdapter,
    NoopSupportNotificationAdapter,
    {
      provide: CHAT_IDENTITY_PORT,
      useExisting: JornadaChatIdentityAdapter,
    },
    {
      provide: SUPPORT_NOTIFICATION_PORT,
      useExisting: NoopSupportNotificationAdapter,
    },
  ],
})
export class ChatModule {}

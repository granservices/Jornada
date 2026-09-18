import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { ListChatConversationsDto } from './dto/list-chat-conversations.dto';
import { ListChatMessagesDto } from './dto/list-chat-messages.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatRealtimeService: ChatRealtimeService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Lista conversas do colaborador por setor.' })
  @ApiOkResponse({ description: 'Conversas retornadas com sucesso.' })
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListChatConversationsDto,
  ) {
    return this.chatService.listConversations(user, query);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Lista mensagens paginadas de uma conversa.' })
  @ApiOkResponse({ description: 'Mensagens retornadas com sucesso.' })
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Query() query: ListChatMessagesDto,
  ) {
    return this.chatService.listMessages(user, conversationId, query);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Envia mensagem para uma conversa.' })
  @ApiOkResponse({ description: 'Mensagem enviada com sucesso.' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    const result = await this.chatService.sendMessage(
      user,
      conversationId,
      dto,
    );

    this.chatRealtimeService.emitMessage(conversationId, result.message);
    this.chatRealtimeService.emitConversationUpdated(
      user.id,
      result.conversation,
    );

    return result;
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Marca uma conversa como lida.' })
  @ApiOkResponse({ description: 'Leitura registrada com sucesso.' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.markRead(user, conversationId);
  }
}

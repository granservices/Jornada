import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ChatActorSnapshot,
  ChatIdentityPort,
} from '../ports/chat-identity.port';

@Injectable()
export class JornadaChatIdentityAdapter implements ChatIdentityPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUser(userId: string): Promise<ChatActorSnapshot> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        person: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return {
      actorType: 'USER',
      actorId: userId,
      displayName: user?.person.fullName ?? user?.email ?? 'Usuario',
    };
  }
}

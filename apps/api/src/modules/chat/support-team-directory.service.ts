import { Injectable } from '@nestjs/common';
import { ChatSector } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type SupportTeamSeed = {
  code: string;
  name: string;
  legacySector?: ChatSector;
};

export const DEFAULT_SUPPORT_TEAMS: SupportTeamSeed[] = [
  { code: 'OPERATIONS', name: 'Operacoes', legacySector: ChatSector.OPERATIONS },
  { code: 'MEDICINE', name: 'Medicina', legacySector: ChatSector.MEDICINE },
  { code: 'TRAINING', name: 'Treinamento', legacySector: ChatSector.TRAINING },
  { code: 'TI', name: 'Tecnologia', legacySector: ChatSector.TI },
  { code: 'SUPPORT', name: 'Suporte interno', legacySector: ChatSector.SUPPORT },
];

@Injectable()
export class SupportTeamDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultTeams() {
    return Promise.all(
      DEFAULT_SUPPORT_TEAMS.map((team) =>
        this.prisma.supportTeam.upsert({
          where: { code: team.code },
          create: {
            code: team.code,
            name: team.name,
          },
          update: {
            name: team.name,
          },
        }),
      ),
    );
  }

  async findTeamByCode(code: string) {
    return this.prisma.supportTeam.findUnique({
      where: { code },
    });
  }

  async listActiveTeams() {
    return this.prisma.supportTeam.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }
}

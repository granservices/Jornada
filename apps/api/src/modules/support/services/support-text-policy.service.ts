import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const MAX_SUPPORT_TEXT_LENGTH = 2000;

@Injectable()
export class SupportTextPolicyService {
  normalizeUserText(value: string, fieldLabel: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldLabel} nao pode ficar vazio.`);
    }

    if (normalized.length > MAX_SUPPORT_TEXT_LENGTH) {
      throw new BadRequestException(
        `${fieldLabel} deve ter no maximo ${MAX_SUPPORT_TEXT_LENGTH} caracteres.`,
      );
    }

    return normalized;
  }

  optionalMetadata(): Prisma.InputJsonObject {
    return {
      privacy: {
        classification: 'POTENTIALLY_SENSITIVE',
        retentionClass: 'SUPPORT_CASE_CONTENT',
      },
    };
  }
}

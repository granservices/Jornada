import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SupportSlaService {
  calculateDueAt(startedAt: Date, targetMinutes: number) {
    if (!Number.isInteger(targetMinutes) || targetMinutes <= 0) {
      throw new BadRequestException('Meta de SLA deve ser informada em minutos positivos.');
    }

    return new Date(startedAt.getTime() + targetMinutes * 60_000);
  }
}

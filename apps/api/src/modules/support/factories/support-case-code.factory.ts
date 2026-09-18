import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SupportCaseCodeFactory {
  create() {
    const datePart = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    const randomPart = randomUUID().slice(0, 8).toUpperCase();

    return `ATD-${datePart}-${randomPart}`;
  }
}

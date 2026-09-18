import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

type PreviewWorker = {
  workerId: string;
  employeeNumber?: string | null;
  operationalUnitId: string;
  operationalUnitName: string | null;
};

type PreviewPayload = PreviewWorker & { subject: string; expiresAt: number };

@Injectable()
export class DrakeSchedulePreviewReferenceService {
  constructor(private readonly config: ConfigService) {}

  issue(subject: string, worker: PreviewWorker) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify({ subject, ...worker, expiresAt: Date.now() + 5 * 60_000 } satisfies PreviewPayload), 'utf8'),
      cipher.final(),
    ]);
    return [iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  }

  resolve(subject: string, reference: string) {
    const [ivValue, encryptedValue, tagValue, extra] = reference.split('.');
    if (!ivValue || !encryptedValue || !tagValue || extra) {
      throw new BadRequestException('Referencia de validacao invalida.');
    }

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivValue, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      const payload = JSON.parse(Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8')) as PreviewPayload;

      if (payload.subject !== subject || payload.expiresAt <= Date.now() || !payload.workerId || !payload.operationalUnitId) {
        throw new BadRequestException('Referencia de validacao expirada ou invalida.');
      }

      return {
        workerId: payload.workerId,
        employeeNumber: payload.employeeNumber ?? null,
        operationalUnitId: payload.operationalUnitId,
        operationalUnitName: payload.operationalUnitName,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Referencia de validacao invalida.');
    }
  }

  private key() {
    return createHash('sha256')
      .update(this.config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .digest();
  }
}

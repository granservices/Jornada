import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DrakeWebhookType } from './drake.types';

@Injectable()
export class DrakeWebhookStorageService {
  constructor(private readonly configService: ConfigService) {}

  async persist(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    metadata: Record<string, string | null>,
  ) {
    const storageDir = this.resolveStorageDir();
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replaceAll(':', '-');
    const filePath = path.join(
      storageDir,
      `${safeTimestamp}-${webhookType}.json`,
    );

    await mkdir(storageDir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify(
        {
          storedAt: timestamp,
          webhookType,
          metadata,
          payload,
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private resolveStorageDir() {
    const configuredPath = this.configService.get<string>(
      'WEBHOOK_STORAGE_DIR',
    );
    return path.resolve(configuredPath ?? './data/webhooks');
  }
}

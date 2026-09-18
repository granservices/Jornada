import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NormalizedBody } from './intake.types';

@Injectable()
export class IntakeRawStorageService {
  constructor(private readonly configService: ConfigService) {}

  async persist(input: {
    id: string;
    receivedAt: string;
    eventType: string;
    source: string;
    contentType: string | null;
    sha256: string;
    normalizedBody: NormalizedBody;
  }) {
    const storageDir = this.resolveStorageDir();
    const day = input.receivedAt.slice(0, 10);
    const safeTimestamp = input.receivedAt.replaceAll(':', '-');
    const filePath = path.join(
      storageDir,
      day,
      `${safeTimestamp}-${input.eventType}-${input.id}.json`,
    );

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify(
        {
          id: input.id,
          receivedAt: input.receivedAt,
          source: input.source,
          eventType: input.eventType,
          contentType: input.contentType,
          sha256: input.sha256,
          bodyKind: input.normalizedBody.bodyKind,
          parseError: input.normalizedBody.parseError,
          payload: input.normalizedBody.payload,
          rawBodyText: input.normalizedBody.rawBodyText,
          rawBodyBase64: input.normalizedBody.rawBodyBase64,
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private resolveStorageDir() {
    const configuredPath =
      this.configService.get<string>('INTAKE_STORAGE_DIR');

    return path.resolve(configuredPath ?? './data/raw-events');
  }
}

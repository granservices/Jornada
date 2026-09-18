import { Injectable } from '@nestjs/common';
import { NormalizedBody } from './intake.types';

@Injectable()
export class IntakeBodyService {
  normalize(body: unknown): NormalizedBody {
    if (!Buffer.isBuffer(body)) {
      return {
        bodyKind: body === undefined ? 'empty' : 'json',
        payload: body ?? null,
        rawBodyText: null,
        rawBodyBase64: null,
        parseError: null,
      };
    }

    if (body.length === 0) {
      return {
        bodyKind: 'empty',
        payload: null,
        rawBodyText: '',
        rawBodyBase64: null,
        parseError: null,
      };
    }

    const text = body.toString('utf8');
    const parsed = this.parseJson(text);

    if (parsed.ok) {
      return {
        bodyKind: parsed.partial ? 'partial-json' : 'json',
        payload: parsed.value,
        rawBodyText: text,
        rawBodyBase64: null,
        parseError: parsed.partial ? parsed.error : null,
      };
    }

    if (!text.includes('\u0000')) {
      return {
        bodyKind: 'text',
        payload: text,
        rawBodyText: text,
        rawBodyBase64: null,
        parseError: parsed.error,
      };
    }

    return {
      bodyKind: 'binary',
      payload: null,
      rawBodyText: null,
      rawBodyBase64: body.toString('base64'),
      parseError: parsed.error,
    };
  }

  private parseJson(value: string):
    | { ok: true; value: unknown; partial: boolean; error: string | null }
    | { ok: false; error: string } {
    try {
      return {
        ok: true,
        value: JSON.parse(value),
        partial: false,
        error: null,
      };
    } catch (error) {
      const recovered = this.tryParseFirstJsonObject(value);

      if (recovered.ok) {
        return {
          ok: true,
          value: recovered.value,
          partial: true,
          error: this.errorMessage(error),
        };
      }

      return {
        ok: false,
        error: this.errorMessage(error),
      };
    }
  }

  private tryParseFirstJsonObject(
    value: string,
  ): { ok: true; value: unknown } | { ok: false } {
    const start = value.search(/[{\[]/);

    if (start < 0) {
      return { ok: false };
    }

    const opener = value[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < value.length; index += 1) {
      const char = value[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === opener) {
        depth += 1;
      }

      if (char === closer) {
        depth -= 1;

        if (depth === 0) {
          try {
            return {
              ok: true,
              value: JSON.parse(value.slice(start, index + 1)),
            };
          } catch {
            return { ok: false };
          }
        }
      }
    }

    return { ok: false };
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

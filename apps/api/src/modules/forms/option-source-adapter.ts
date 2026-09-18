import { OptionSourceAdapterType } from '@prisma/client';
import type {
  OptionQuery,
  OptionQueryResult,
  OptionSourceConfig,
  OptionSourceRecord,
} from './option-source.types';

export interface OptionSourceAdapter {
  readonly type: OptionSourceAdapterType;
  query(source: OptionSourceRecord, query: OptionQuery): Promise<OptionQueryResult>;
}

export function isOptionSourceConfig(value: unknown): value is OptionSourceConfig {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}


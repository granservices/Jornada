import { OptionSourceAdapterType } from '@prisma/client';

export type NormalizedOption = {
  value: string;
  label: string;
  meta?: Record<string, string | number | boolean>;
};

export type OptionQuery = {
  query: string;
  cursor?: string;
  limit: number;
  signal?: AbortSignal;
};

export type OptionQueryResult = {
  items: NormalizedOption[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type OptionSourceConfig = {
  options?: Array<{ value: string; label: string }>;
  endpoint?: string;
  queryParam?: string;
  itemsPath?: string;
  valuePath?: string;
  labelPath?: string;
};

export type OptionSourceRecord = {
  key: string;
  adapterType: OptionSourceAdapterType;
  config: unknown;
};


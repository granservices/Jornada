import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StoredIntakeEvent } from './intake.types';

type SummaryRow = {
  eventType: string;
  status: string;
  total: number;
};

type StoredIntakeEventRow = Omit<StoredIntakeEvent, 'eligibleWithin15Days'> & {
  eligibleWithin15Days: 0 | 1;
};

@Injectable()
export class IntakeSqliteService implements OnModuleInit, OnModuleDestroy {
  private database: DatabaseSync | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const databasePath = this.resolveDatabasePath();
    mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA journal_mode = WAL;');
    this.database.exec('PRAGMA foreign_keys = ON;');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS intake_events (
        id TEXT PRIMARY KEY,
        received_at TEXT NOT NULL,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL,
        body_kind TEXT NOT NULL,
        content_type TEXT,
        sha256 TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        duplicate_of TEXT,
        parse_error TEXT,
        worker_key TEXT,
        worker_name TEXT,
        pendency_kind TEXT,
        training_list TEXT,
        due_date TEXT,
        days_until_due INTEGER,
        logistics_event_date TEXT,
        logistics_action TEXT,
        eligible_within_15_days INTEGER NOT NULL DEFAULT 0,
        summary TEXT
      ) STRICT;

      DROP INDEX IF EXISTS idx_intake_events_sha256;

      CREATE INDEX IF NOT EXISTS idx_intake_events_sha256
        ON intake_events(sha256);

      CREATE INDEX IF NOT EXISTS idx_intake_events_received_at
        ON intake_events(received_at);

      CREATE INDEX IF NOT EXISTS idx_intake_events_type_status
        ON intake_events(event_type, status);

      CREATE INDEX IF NOT EXISTS idx_intake_events_due_date
        ON intake_events(due_date);
    `);
  }

  onModuleDestroy() {
    this.database?.close();
    this.database = null;
  }

  findByHash(sha256: string): Pick<StoredIntakeEvent, 'id'> | null {
    const query = this.db().prepare(
      'SELECT id FROM intake_events WHERE sha256 = ? LIMIT 1',
    );

    return (query.get(sha256) as Pick<StoredIntakeEvent, 'id'> | undefined) ?? null;
  }

  insert(event: StoredIntakeEvent) {
    const statement = this.db().prepare(`
      INSERT INTO intake_events (
        id,
        received_at,
        source,
        event_type,
        status,
        body_kind,
        content_type,
        sha256,
        storage_path,
        duplicate_of,
        parse_error,
        worker_key,
        worker_name,
        pendency_kind,
        training_list,
        due_date,
        days_until_due,
        logistics_event_date,
        logistics_action,
        eligible_within_15_days,
        summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      event.id,
      event.receivedAt,
      event.source,
      event.eventType,
      event.status,
      event.bodyKind,
      event.contentType,
      event.sha256,
      event.storagePath,
      event.duplicateOf,
      event.parseError,
      event.workerKey,
      event.workerName,
      event.pendencyKind,
      event.trainingList,
      event.dueDate,
      event.daysUntilDue,
      event.logisticsEventDate,
      event.logisticsAction,
      event.eligibleWithin15Days ? 1 : 0,
      event.summary,
    );
  }

  list(input: { eventType?: string; status?: string; limit: number }) {
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (input.eventType) {
      clauses.push('event_type = ?');
      params.push(input.eventType);
    }

    if (input.status) {
      clauses.push('status = ?');
      params.push(input.status);
    }

    params.push(input.limit);

    const query = this.db().prepare(`
      SELECT
        id,
        received_at AS receivedAt,
        source,
        event_type AS eventType,
        status,
        body_kind AS bodyKind,
        content_type AS contentType,
        sha256,
        storage_path AS storagePath,
        duplicate_of AS duplicateOf,
        parse_error AS parseError,
        worker_key AS workerKey,
        worker_name AS workerName,
        pendency_kind AS pendencyKind,
        training_list AS trainingList,
        due_date AS dueDate,
        days_until_due AS daysUntilDue,
        logistics_event_date AS logisticsEventDate,
        logistics_action AS logisticsAction,
        eligible_within_15_days AS eligibleWithin15Days,
        summary
      FROM intake_events
      ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY received_at DESC
      LIMIT ?
    `);

    return (query.all(...params) as StoredIntakeEventRow[]).map((event) => ({
      ...event,
      eligibleWithin15Days: event.eligibleWithin15Days === 1,
    }));
  }

  summary() {
    const query = this.db().prepare(`
      SELECT event_type AS eventType, status, COUNT(*) AS total
      FROM intake_events
      GROUP BY event_type, status
      ORDER BY event_type, status
    `);

    const rows = query.all() as SummaryRow[];
    return rows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      acc[row.eventType] ??= {};
      acc[row.eventType][row.status] = row.total;
      return acc;
    }, {});
  }

  qualificationPreview(days: number) {
    const query = this.db().prepare(`
      SELECT
        id,
        received_at AS receivedAt,
        source,
        event_type AS eventType,
        status,
        body_kind AS bodyKind,
        content_type AS contentType,
        sha256,
        storage_path AS storagePath,
        duplicate_of AS duplicateOf,
        parse_error AS parseError,
        worker_key AS workerKey,
        worker_name AS workerName,
        pendency_kind AS pendencyKind,
        training_list AS trainingList,
        due_date AS dueDate,
        days_until_due AS daysUntilDue,
        logistics_event_date AS logisticsEventDate,
        logistics_action AS logisticsAction,
        eligible_within_15_days AS eligibleWithin15Days,
        summary
      FROM intake_events
      WHERE event_type = 'qualification_pending'
        AND status IN ('stored', 'duplicate')
        AND days_until_due IS NOT NULL
        AND days_until_due <= ?
      ORDER BY days_until_due ASC, received_at DESC
    `);

    return (query.all(days) as StoredIntakeEventRow[]).map((event) => ({
      ...event,
      eligibleWithin15Days: event.eligibleWithin15Days === 1,
    }));
  }

  private db() {
    if (!this.database) {
      throw new Error('Intake SQLite database is not initialized.');
    }

    return this.database;
  }

  private resolveDatabasePath() {
    const configuredPath =
      this.configService.get<string>('INTAKE_SQLITE_PATH');

    return path.resolve(configuredPath ?? './data/intake.sqlite');
  }
}

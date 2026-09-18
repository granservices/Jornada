import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.INTAKE_BEARER_TOKEN = '12345678901234567890123456789012';
process.env.INTAKE_AUTH_DISABLED = 'false';
process.env.INTAKE_STORAGE_DIR = path.join(
  tmpdir(),
  `intake-api-e2e-${process.pid}`,
  'raw-events',
);
process.env.INTAKE_SQLITE_PATH = path.join(
  tmpdir(),
  `intake-api-e2e-${process.pid}`,
  'intake.sqlite',
);

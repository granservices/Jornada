import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma migrations', () => {
  it('keeps every migration directory deployable', () => {
    const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
    const migrationDirectories = readdirSync(migrationsDir)
      .map((name) => join(migrationsDir, name))
      .filter((path) => statSync(path).isDirectory());

    expect(migrationDirectories).not.toHaveLength(0);
    expect(
      migrationDirectories
        .filter((path) => !existsSync(join(path, 'migration.sql')))
        .map((path) => path.replace(`${migrationsDir}\\`, '')),
    ).toEqual([]);
  });
});

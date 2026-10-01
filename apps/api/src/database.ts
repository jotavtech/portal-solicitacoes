import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function migrate(db: Database.Database) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  const directory = resolve('database');
  for (const name of readdirSync(directory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort()) {
    const sql = readFileSync(resolve(directory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    db.transaction(() => {
      const applied = db.prepare('SELECT checksum FROM migrations WHERE name=?').get(name) as
        { checksum: string } | undefined;
      if (applied) {
        if (applied.checksum !== checksum)
          throw new Error(`Migration aplicada foi modificada: ${name}`);
        return;
      }
      db.exec(sql);
      db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(
        name,
        checksum,
        new Date().toISOString(),
      );
    }).immediate();
  }
}

export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new Database(path);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    if (path !== ':memory:') db.pragma('journal_mode = WAL');
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

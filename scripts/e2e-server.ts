import { mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../apps/api/src/app.js';
import { openDatabase } from '../apps/api/src/database.js';
import { seedDemo } from '../apps/api/src/seed.js';
const directory = mkdtempSync(join(tmpdir(), 'portal-e2e-')),
  db = openDatabase(join(directory, 'test.sqlite'));
await seedDemo(db, true);
const server = createApp({
  db,
  loginRateLimit: 100,
  webDirectory: resolve('apps/web/dist'),
}).listen(4173, '127.0.0.1');
const clean = () => {
  if (db.open) db.close();
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('portal-e2e-')
  )
    throw new Error('Diretório de teste fora do destino esperado.');
  rmSync(directory, { recursive: true, force: true });
};
process.on('exit', clean);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));

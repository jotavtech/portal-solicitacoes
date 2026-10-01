import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';

const config = loadConfig(),
  db = openDatabase(config.DATABASE_PATH),
  webDirectory = resolve('apps/web/dist');
if (config.NODE_ENV === 'production' && !existsSync(resolve(webDirectory, 'index.html'))) {
  db.close();
  throw new Error('Frontend não compilado. Execute npm run build.');
}
const app = createApp({
  db,
  cookieSecure: config.COOKIE_SECURE,
  sessionTtlMs: config.SESSION_TTL_SECONDS * 1000,
  timeZone: config.APP_TIMEZONE,
  trustProxy: config.TRUST_PROXY_LOOPBACK,
  webDirectory: existsSync(resolve(webDirectory, 'index.html')) ? webDirectory : undefined,
});
const server = app.listen(config.PORT, '127.0.0.1', () =>
  console.log(`Portal disponível em http://localhost:${config.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );

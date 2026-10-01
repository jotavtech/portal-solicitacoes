import { build as buildApi } from 'esbuild';
import { build as buildWeb } from 'vite';
import { resolve } from 'node:path';
// O .env de desenvolvimento não deve produzir um bundle React de desenvolvimento.
process.env.NODE_ENV = 'production';
await buildApi({
  entryPoints: ['apps/api/src/server.ts'],
  outdir: 'apps/api/dist',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  packages: 'external',
  alias: { '@portal/contracts': resolve('packages/contracts/src/index.ts') },
  sourcemap: true,
});
await buildWeb({ configFile: 'apps/web/vite.config.ts' });

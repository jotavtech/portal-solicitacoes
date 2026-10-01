import { chromium } from '@playwright/test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../apps/api/src/app.js';
import { openDatabase } from '../apps/api/src/database.js';
import { seedDemo } from '../apps/api/src/seed.js';

const directory = mkdtempSync(join(tmpdir(), 'portal-evidence-')),
  db = openDatabase(join(directory, 'demo.sqlite'));
const output = resolve('docs/evidence');
mkdirSync(output, { recursive: true });
await seedDemo(db, true);
const server = createApp({ db, webDirectory: resolve('apps/web/dist') }).listen(4180, '127.0.0.1');
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 360, 800],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    await page.goto('http://127.0.0.1:4180/login');
    await page.getByRole('heading', { name: 'Acessar o portal' }).waitFor();
    await page.screenshot({ path: resolve(output, `login-${name}.png`), fullPage: true });
    await page.getByLabel('Usuário', { exact: true }).fill('ana');
    await page.getByLabel('Senha', { exact: true }).fill('Ana-demo-2026!');
    await page.getByRole('button', { name: 'Entrar no portal' }).click();
    await page.getByRole('link', { name: 'Acesso ao sistema financeiro', exact: true }).waitFor();
    await page.locator('.stat-total strong').waitFor();
    await page.screenshot({ path: resolve(output, `dashboard-${name}.png`), fullPage: true });
    if (name === 'desktop') {
      await page.setViewportSize({ width: 1086, height: 920 });
      await page.locator('.filters').screenshot({ path: resolve(output, 'filters-aligned.png') });
      await page.setViewportSize({ width, height });
    }
    await page.goto('http://127.0.0.1:4180/requests/4');
    await page.getByRole('heading', { name: 'Reembolso de deslocamento', exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `detail-${name}.png`), fullPage: true });
    await context.close();
  }
  console.log('Capturas reais geradas com banco temporário de demonstração, incluindo filtros em 1086 px.');
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  db.close();
  if (
    dirname(resolve(directory)) === resolve(tmpdir()) &&
    basename(directory).startsWith('portal-evidence-')
  )
    rmSync(directory, { recursive: true, force: true });
}

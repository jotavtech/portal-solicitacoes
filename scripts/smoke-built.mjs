import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Executar após migrations/seed/build. Porta exclusiva, nenhum registro é alterado.
const child = spawn(process.execPath, ['apps/api/dist/server.js'], {
  cwd: process.cwd(),
  windowsHide: true,
  env: { ...process.env, PORT: '4191', NODE_ENV: 'development', COOKIE_SECURE: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let failure = '';
child.stderr.on('data', (chunk) => {
  failure += chunk.toString();
});
child.stdout.on('data', (chunk) => {
  failure += chunk.toString();
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:4191/api/auth/session');
      if (response.ok) {
        ready = true;
        break;
      }
      failure = `HTTP ${response.status}: ${(await response.text()).slice(0, 120)}`;
    } catch (error) {
      failure = String(error.cause?.code ?? error.message);
    }
    if (child.exitCode !== null) throw new Error(failure || 'Servidor encerrou antes de iniciar.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, `Servidor não iniciou na porta de teste: ${failure}`);
  const base = 'http://127.0.0.1:4191';
  const initial = await fetch(base + '/api/auth/session');
  const anonymousCookie = initial.headers.get('set-cookie').split(';')[0];
  const session = await initial.json();
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: {
      Cookie: anonymousCookie,
      'X-CSRF-Token': session.csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: 'ana', password: 'Ana-demo-2026!' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const list = await fetch(base + '/api/requests', { headers: { Cookie: cookie } });
  assert.equal(list.status, 200);
  assert((await list.json()).total >= 6);
  const page = await fetch(base + '/requests/1');
  assert.equal(page.status, 200);
  assert((await page.text()).includes('<div id="root"></div>'));
  const dashboard = await fetch(base + '/api/dashboard', { headers: { Cookie: cookie } });
  assert.equal(dashboard.status, 200);
  const missing = await fetch(base + '/api/rota-inexistente', { headers: { Cookie: cookie } });
  assert.equal(missing.status, 404);
  assert(missing.headers.get('content-type').includes('application/json'));
  console.log(
    'Build executável verificado: login, API, SQLite, dashboard, fallback SPA e 404 JSON.',
  );
} finally {
  child.kill();
}

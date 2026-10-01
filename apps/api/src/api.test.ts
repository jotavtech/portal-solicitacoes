import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import type { Express } from 'express';
import { createApp } from './app.js';
import { openDatabase, migrate } from './database.js';
import { hashPassword } from './auth/password.js';
import { RequestRepository } from './requests/repository.js';
import { seedDemo } from './seed.js';
import {
  dashboardSchema,
  requestSchema,
  sessionSchema,
  type RequestInput,
} from '@portal/contracts';

let passwordHash: string;
let db: ReturnType<typeof openDatabase>;
let app: Express;
let time = new Date('2026-10-01T12:00:00.000Z');
const input: RequestInput = {
  title: 'Notebook não liga',
  description: 'Notebook apresenta tela preta ao iniciar.',
  category: 'TI',
};
function removeTestDirectory(directory: string) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('portal-api-test-')
  )
    throw new Error('Diretório temporário fora do destino esperado.');
  rmSync(directory, { recursive: true, force: true });
}
beforeAll(async () => {
  passwordHash = await hashPassword('Teste-seguro-2026');
});
function users(database = db) {
  for (const [username, name] of [
    ['ana', 'Ana Teste'],
    ['bruno', 'Bruno Teste'],
  ]) {
    database
      .prepare('INSERT INTO users(username,name,password_hash) VALUES (?,?,?)')
      .run(username, name, passwordHash);
  }
}
beforeEach(() => {
  time = new Date('2026-10-01T12:00:00.000Z');
  db = openDatabase(':memory:');
  users();
  app = createApp({ db, now: () => time });
});
afterEach(() => {
  if (db.open) db.close();
});

async function login(username = 'ana') {
  const agent = supertest.agent(app);
  const before = await agent.get('/api/auth/session').expect(200);
  const result = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', before.body.csrfToken)
    .send({ username, password: 'Teste-seguro-2026' })
    .expect(200);
  return { agent, csrf: result.body.csrfToken as string, before, result };
}
async function create(auth: Awaited<ReturnType<typeof login>>, payload = input) {
  return auth.agent.post('/api/requests').set('X-CSRF-Token', auth.csrf).send(payload).expect(201);
}

describe('SPEC-001 autenticação', () => {
  it('AUTH-01/07/08 sessão anônima, login normalizado, rotação e saída sem secrets', async () => {
    const auth = await login('ANA');
    expect(sessionSchema.parse(auth.before.body).user).toBeNull();
    expect(auth.result.body.user).toEqual({ id: 1, username: 'ana', name: 'Ana Teste' });
    const oldCookie = auth.before.headers['set-cookie'][0].split(';')[0];
    expect(auth.result.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(auth.result.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(auth.result.body.csrfToken).not.toBe(auth.before.body.csrfToken);
    await supertest(app).get('/api/requests').set('Cookie', oldCookie).expect(401);
    await auth.agent.get('/api/requests').expect(200);
    expect(auth.result.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(auth.result.body)).not.toContain('password');
  });
  it('AUTH-02 senha inválida e usuário desconhecido recebem mesma mensagem', async () => {
    const agent = supertest.agent(app);
    const session = await agent.get('/api/auth/session');
    const responses = [];
    for (const username of ['ana', 'inexistente']) {
      responses.push(
        await agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', session.body.csrfToken)
          .send({ username, password: 'errada' })
          .expect(401),
      );
    }
    expect(responses[0].body.error.message).toBe(responses[1].body.error.message);
    await agent.get('/api/requests').expect(401);
  });
  it('AUTH-03/07 rotas protegidas rejeitam sessão ausente, anônima e forjada', async () => {
    for (const path of ['/api/requests', '/api/requests/1', '/api/dashboard']) {
      await supertest(app).get(path).expect(401);
      await supertest(app).get(path).set('Cookie', 'portal.sid=forjado').expect(401);
    }
    const agent = supertest.agent(app);
    await agent.get('/api/auth/session');
    await agent.get('/api/requests').expect(401);
    await agent.post('/api/requests').send(input).expect(401);
  });
  it('AUTH-03/04/05 sessão persiste, expira e logout revoga cookie antigo', async () => {
    const auth = await login();
    expect((await auth.agent.get('/api/auth/session')).body.user.username).toBe('ana');
    const cookie = auth.result.headers['set-cookie'][0].split(';')[0];
    await auth.agent.post('/api/auth/logout').set('X-CSRF-Token', auth.csrf).expect(204);
    await supertest(app).get('/api/requests').set('Cookie', cookie).expect(401);
    const again = await login();
    time = new Date(time.getTime() + 8 * 60 * 60 * 1000);
    await again.agent.get('/api/requests').expect(401);
  });
  it('AUTH-06 CSRF ausente ou de outra sessão bloqueia todas as mutações', async () => {
    const auth = await login();
    const another = await login('bruno');
    const row = (await create(auth)).body;
    for (const token of [undefined, another.csrf]) {
      for (const [method, path, body] of [
        ['post', '/api/requests', input],
        ['put', `/api/requests/${row.id}`, input],
        ['patch', `/api/requests/${row.id}/status`, { status: 'EM_ATENDIMENTO' }],
        ['delete', `/api/requests/${row.id}`, undefined],
        ['post', '/api/auth/logout', undefined],
      ] as const) {
        const call = auth.agent[method](path);
        if (token) call.set('X-CSRF-Token', token);
        if (body) call.send(body);
        await call.expect(403);
      }
    }
    expect((await auth.agent.get(`/api/requests/${row.id}`)).body.status).toBe('ABERTO');
    await supertest(app)
      .post('/api/auth/login')
      .send({ username: 'ana', password: 'x' })
      .expect(403);
  });
  it('AUTH-09 limite de tentativas e reset com relógio controlado', async () => {
    const agent = supertest.agent(app);
    const session = await agent.get('/api/auth/session');
    for (let i = 0; i < 10; i++) {
      await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', session.body.csrfToken)
        .send({ username: 'ana', password: 'errada' })
        .expect(401);
    }
    const limited = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({ username: 'ana', password: 'Teste-seguro-2026' })
      .expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    time = new Date(time.getTime() + 60001);
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({ username: 'ana', password: 'Teste-seguro-2026' })
      .expect(200);
  });
  it('NFR-001 produção usa cookie Secure', async () => {
    app = createApp({ db, now: () => time, cookieSecure: true });
    const result = await supertest(app).get('/api/auth/session');
    expect(result.headers['set-cookie'][0]).toContain('Secure');
  });
});

describe('SPEC-002 solicitações', () => {
  it('REQ-01/03/07 criação e edição preservam autor e data inicial', async () => {
    const auth = await login();
    const first = requestSchema.parse((await create(auth)).body);
    expect(first.requester.id).toBe(1);
    expect(first.status).toBe('ABERTO');
    expect(first.createdAt).toBe(time.toISOString());
    time = new Date(time.getTime() + 1000);
    const edit = await auth.agent
      .put(`/api/requests/${first.id}`)
      .set('X-CSRF-Token', auth.csrf)
      .send({ ...input, title: '  Notebook corrigido  ', category: 'RH' })
      .expect(200);
    expect(edit.body.title).toBe('Notebook corrigido');
    expect(edit.body.createdAt).toBe(first.createdAt);
    expect(edit.body.updatedAt).toBe(time.toISOString());
    const list = await auth.agent.get('/api/requests').expect(200);
    expect(list.body.items[0]).toEqual(edit.body);
    expect((await auth.agent.get(`/api/requests/${first.id}`)).body).toEqual(edit.body);
  });
  it('REQ-02 limites, campos extras e enums inválidos não gravam', async () => {
    const auth = await login();
    for (const invalid of [
      { ...input, title: 'ab' },
      { ...input, title: 'x'.repeat(121) },
      { ...input, description: 'curta' },
      { ...input, description: 'x'.repeat(5001) },
      { ...input, category: 'OUTRA' },
      { ...input, status: 'CONCLUIDO' },
      { ...input, requester_id: 2 },
      { ...input, createdAt: time.toISOString() },
    ]) {
      const result = await auth.agent
        .post('/api/requests')
        .set('X-CSRF-Token', auth.csrf)
        .send(invalid)
        .expect(422);
      expect(result.body.error.fields).toBeDefined();
    }
    expect((await auth.agent.get('/api/requests')).body.total).toBe(0);
    await create(auth, { ...input, title: '😀'.repeat(120), description: 'x'.repeat(5000) });
  });
  it('REQ-04/08/09 status avança, é idempotente e bloqueia edição/exclusão', async () => {
    const auth = await login();
    const row = (await create(auth)).body;
    await auth.agent
      .patch(`/api/requests/${row.id}/status`)
      .set('X-CSRF-Token', auth.csrf)
      .send({ status: 'CONCLUIDO' })
      .expect(409);
    for (const status of ['EM_ATENDIMENTO', 'CONCLUIDO']) {
      time = new Date(time.getTime() + 1000);
      const result = await auth.agent
        .patch(`/api/requests/${row.id}/status`)
        .set('X-CSRF-Token', auth.csrf)
        .send({ status })
        .expect(200);
      time = new Date(time.getTime() + 1000);
      const same = await auth.agent
        .patch(`/api/requests/${row.id}/status`)
        .set('X-CSRF-Token', auth.csrf)
        .send({ status })
        .expect(200);
      expect(same.body.updatedAt).toBe(result.body.updatedAt);
      await auth.agent
        .put(`/api/requests/${row.id}`)
        .set('X-CSRF-Token', auth.csrf)
        .send(input)
        .expect(409);
      await auth.agent.delete(`/api/requests/${row.id}`).set('X-CSRF-Token', auth.csrf).expect(409);
      await auth.agent
        .patch(`/api/requests/${row.id}/status`)
        .set('X-CSRF-Token', auth.csrf)
        .send({ status: 'ABERTO' })
        .expect(409);
    }
    expect((await auth.agent.get(`/api/requests/${row.id}`)).body.description).toBe(
      input.description,
    );
  });
  it('REQ-05 segundo usuário visualiza e atende, mas não edita nem exclui', async () => {
    const owner = await login();
    const row = (await create(owner)).body;
    const other = await login('bruno');
    await other.agent.get(`/api/requests/${row.id}`).expect(200);
    await other.agent
      .put(`/api/requests/${row.id}`)
      .set('X-CSRF-Token', other.csrf)
      .send(input)
      .expect(403);
    await other.agent.delete(`/api/requests/${row.id}`).set('X-CSRF-Token', other.csrf).expect(403);
    await other.agent
      .patch(`/api/requests/${row.id}/status`)
      .set('X-CSRF-Token', other.csrf)
      .send({ status: 'EM_ATENDIMENTO' })
      .expect(200);
  });
  it('REQ-06 exclusão aberta é física', async () => {
    const auth = await login();
    const row = (await create(auth)).body;
    await auth.agent.delete(`/api/requests/${row.id}`).set('X-CSRF-Token', auth.csrf).expect(204);
    await auth.agent.get(`/api/requests/${row.id}`).expect(404);
    expect((await auth.agent.get('/api/requests')).body.total).toBe(0);
  });
  it('REQ-10/12 filtros AND, texto literal, aspas e curingas', async () => {
    const auth = await login();
    await create(auth, { ...input, title: "Compra de 100%_ ' equipamentos", category: 'COMPRAS' });
    await create(auth, { ...input, title: 'Compra de equipamentos', category: 'TI' });
    const filtered = await auth.agent
      .get('/api/requests')
      .query({ q: 'COMPRA', category: 'COMPRAS', status: 'ABERTO' })
      .expect(200);
    expect(filtered.body.total).toBe(1);
    for (const q of ['%', '_', "'"])
      expect((await auth.agent.get('/api/requests').query({ q })).body.total).toBe(1);
    expect((await auth.agent.get('/api/requests').query({ q: "' OR 1=1 --" })).body.total).toBe(0);
    expect((await auth.agent.get('/api/requests')).body.total).toBe(2);
  });
  it('REQ-11 período inclui fronteiras corretas no fuso', async () => {
    for (const stamp of [
      '2026-10-01T02:59:59.999Z',
      '2026-10-01T03:00:00.000Z',
      '2026-10-02T02:59:59.999Z',
      '2026-10-02T03:00:00.000Z',
    ]) {
      time = new Date(stamp);
      await create(await login());
    }
    time = new Date('2026-10-01T12:00:00.000Z');
    const auth = await login();
    expect(
      (await auth.agent.get('/api/requests').query({ from: '2026-10-01', to: '2026-10-01' })).body
        .total,
    ).toBe(2);
    expect((await auth.agent.get('/api/requests').query({ from: '2026-10-01' })).body.total).toBe(
      3,
    );
    expect((await auth.agent.get('/api/requests').query({ to: '2026-10-01' })).body.total).toBe(3);
    for (const query of [{ from: '2026-02-30' }, { from: '2026-10-02', to: '2026-10-01' }]) {
      await auth.agent.get('/api/requests').query(query).expect(422);
    }
  });
  it('REQ-13 paginação estável, total antes de paginar e query estrita', async () => {
    const auth = await login();
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) ids.push((await create(auth)).body.id);
    const page = await auth.agent.get('/api/requests').query({ page: 2, pageSize: 1 }).expect(200);
    expect(page.body.total).toBe(3);
    expect(page.body.items[0].id).toBe(ids[1]);
    expect(
      (await auth.agent.get('/api/requests').query({ page: 4, pageSize: 1 })).body.items,
    ).toEqual([]);
    for (const query of [
      'page=0',
      'pageSize=101',
      'page=1.5',
      'unknown=1',
      'status=ABERTO&status=CONCLUIDO',
      'category=OUTRA',
      'q=' + 'x'.repeat(121),
    ]) {
      await auth.agent.get(`/api/requests?${query}`).expect(422);
    }
  });
  it('REQ-14 IDs inválidos, inexistentes e JSON malformado', async () => {
    const auth = await login();
    for (const id of ['0', '-1', 'abc', '1.5', '9007199254740993'])
      await auth.agent.get(`/api/requests/${id}`).expect(422);
    await auth.agent.get('/api/requests/999').expect(404);
    await auth.agent
      .post('/api/requests')
      .set('X-CSRF-Token', auth.csrf)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    await auth.agent.get('/api/inexistente').expect(404);
  });
  it('REQ-15 repositório bloqueia escrita após status mudar', () => {
    const repository = new RequestRepository(db);
    const row = repository.create(input, 1, time.toISOString());
    expect(repository.find(row.id)?.status).toBe('ABERTO');
    db.prepare('UPDATE requests SET status=? WHERE id=?').run('EM_ATENDIMENTO', row.id);
    expect(
      repository.updateOpen(row.id, 1, { ...input, title: 'Alteração tardia' }, time.toISOString()),
    ).toBe(false);
    expect(repository.deleteOpen(row.id, 1)).toBe(false);
    expect(repository.find(row.id)?.title).toBe(input.title);
  });
});

describe('SPEC-003 dashboard', () => {
  it('DASH-01/02/03/04/05 indicadores globais e coerentes após mutações', async () => {
    await supertest(app).get('/api/dashboard').expect(401);
    const auth = await login();
    expect(dashboardSchema.parse((await auth.agent.get('/api/dashboard')).body)).toEqual({
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
    });
    const one = (await create(auth)).body;
    const two = (await create(auth)).body;
    const other = await login('bruno');
    await create(other, { ...input, category: 'RH' });
    await auth.agent
      .patch(`/api/requests/${one.id}/status`)
      .set('X-CSRF-Token', auth.csrf)
      .send({ status: 'EM_ATENDIMENTO' });
    await auth.agent
      .patch(`/api/requests/${one.id}/status`)
      .set('X-CSRF-Token', auth.csrf)
      .send({ status: 'CONCLUIDO' });
    await auth.agent
      .patch(`/api/requests/${two.id}/status`)
      .set('X-CSRF-Token', auth.csrf)
      .send({ status: 'EM_ATENDIMENTO' });
    await auth.agent.get('/api/requests?category=RH');
    expect((await auth.agent.get('/api/dashboard')).body).toEqual({
      total: 3,
      open: 1,
      inProgress: 1,
      completed: 1,
    });
    const extra = (await create(auth)).body;
    await auth.agent.delete(`/api/requests/${extra.id}`).set('X-CSRF-Token', auth.csrf).expect(204);
    expect((await auth.agent.get('/api/dashboard')).body.total).toBe(3);
  });
});

describe('NFR-005 migrations, seed e persistência', () => {
  it('migration com checksum diferente é rejeitada sem recriar dados', () => {
    db.prepare('UPDATE migrations SET checksum=? WHERE name=?').run('alterado', '001_schema.sql');
    expect(() => migrate(db)).toThrow(/modificada/);
    expect(db.prepare('SELECT count(*) total FROM users').get()).toEqual({ total: 2 });
  });
  it('migration repetida preserva dados; seed é opt-in e idempotente', async () => {
    migrate(db);
    expect(db.prepare('SELECT count(*) as total FROM users').get()).toEqual({ total: 2 });
    await expect(seedDemo(db, false, time)).rejects.toThrow(/habilitado/);
    await seedDemo(db, true, time);
    const counts = db
      .prepare(
        'SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM requests) requests',
      )
      .get();
    await seedDemo(db, true, time);
    expect(
      db
        .prepare(
          'SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM requests) requests',
        )
        .get(),
    ).toEqual(counts);
    expect(db.prepare('SELECT password_hash FROM users WHERE username=?').get('ana')).toEqual({
      password_hash: passwordHash,
    });
  });
  it('REQ-01 arquivo persiste após reiniciar API e conexão', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'portal-api-test-'));
    const file = join(directory, 'db.sqlite');
    let persistent = openDatabase(file);
    try {
      users(persistent);
      app = createApp({ db: persistent, now: () => time });
      const auth = await login();
      const row = (await create(auth)).body;
      persistent.close();
      persistent = openDatabase(file);
      app = createApp({ db: persistent, now: () => time });
      const after = await login();
      expect((await after.agent.get(`/api/requests/${row.id}`).expect(200)).body.title).toBe(
        input.title,
      );
    } finally {
      if (persistent.open) persistent.close();
      removeTestDirectory(directory);
    }
  });
});

it('NFR-001 corpo maior que 32 KiB é rejeitado sem gravar', async () => {
  const auth = await login();
  const response = await auth.agent
    .post('/api/requests')
    .set('X-CSRF-Token', auth.csrf)
    .send({ ...input, description: 'x'.repeat(40000) })
    .expect(413);
  expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  expect((await auth.agent.get('/api/requests')).body.total).toBe(0);
});

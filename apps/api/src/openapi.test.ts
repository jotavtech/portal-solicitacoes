import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import supertest from 'supertest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createApp } from './app.js';
import { openDatabase } from './database.js';
import { hashPassword } from './auth/password.js';

const contract = JSON.parse(readFileSync('specs/openapi.json', 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ ...contract, $id: 'urn:portal:openapi' }, 'urn:portal:openapi');
function matches(schema: string, payload: unknown) {
  const validate = ajv.compile({ $ref: `urn:portal:openapi#/components/schemas/${schema}` });
  expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
}
const db = openDatabase(':memory:'),
  app = createApp({ db });
beforeAll(async () => {
  db.prepare('INSERT INTO users(username,name,password_hash) VALUES (?,?,?)').run(
    'ana',
    'Ana',
    await hashPassword('Contrato-2026!'),
  );
});
afterAll(() => db.close());
describe('Contrato OpenAPI em respostas HTTP reais', () => {
  it('sessão, login, solicitação, página, dashboard e erros obedecem ao contrato', async () => {
    const agent = supertest.agent(app);
    const session = await agent.get('/api/auth/session').expect(200);
    matches('Session', session.body);
    const login = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.body.csrfToken)
      .send({ username: 'ana', password: 'Contrato-2026!' })
      .expect(200);
    matches('AuthenticatedSession', login.body);
    const created = await agent
      .post('/api/requests')
      .set('X-CSRF-Token', login.body.csrfToken)
      .send({
        title: 'Contrato real',
        description: 'Esta solicitação verifica a resposta HTTP.',
        category: 'TI',
      })
      .expect(201);
    matches('Request', created.body);
    matches('Request', (await agent.get(`/api/requests/${created.body.id}`)).body);
    matches('RequestPage', (await agent.get('/api/requests')).body);
    matches('Dashboard', (await agent.get('/api/dashboard')).body);
    matches('Error', (await agent.get('/api/requests/999').expect(404)).body);
    matches(
      'Error',
      (
        await agent
          .post('/api/requests')
          .set('X-CSRF-Token', login.body.csrfToken)
          .send({})
          .expect(422)
      ).body,
    );
    matches('Error', (await supertest(app).get('/api/requests').expect(401)).body);
  });
});

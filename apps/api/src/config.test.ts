import { describe, it, expect } from 'vitest';
import { loadConfig } from './config.js';
describe('NFR-005 configuração validada', () => {
  it('defaults previsíveis e produção exige cookie seguro', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3001);
    expect(config.SESSION_TTL_SECONDS).toBe(28800);
    expect(loadConfig({ NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
    expect(() => loadConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow(/HTTPS/);
  });
  it('rejeita porta, duração, fuso e booleano inválidos', () => {
    for (const env of [
      { PORT: '0' },
      { SESSION_TTL_SECONDS: '-1' },
      { APP_TIMEZONE: 'Inexistente/Fuso' },
      { COOKIE_SECURE: 'yes' },
    ])
      expect(() => loadConfig(env)).toThrow();
  });
});

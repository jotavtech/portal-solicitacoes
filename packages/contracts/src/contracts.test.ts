import { describe, expect, it } from 'vitest';
import { loginInputSchema, requestInputSchema } from './index.js';
import { dateBoundary, filtersSchema } from '../../../apps/api/src/requests/filters.js';
import { canAdvance } from '../../../apps/api/src/requests/service.js';

describe('SPEC-002 regras e limites', () => {
  it('REQ-02 valida pontos de código e apara textos', () => {
    const valid = { title: '😀'.repeat(120), description: 'x'.repeat(10), category: 'TI' };
    expect(requestInputSchema.parse(valid).title).toBe(valid.title);
    expect(requestInputSchema.safeParse({ ...valid, title: '😀'.repeat(121) }).success).toBe(false);
    expect(requestInputSchema.parse({ ...valid, title: '  abc  ' }).title).toBe('abc');
    expect(requestInputSchema.safeParse({ ...valid, description: ' '.repeat(10) }).success).toBe(
      false,
    );
    expect(requestInputSchema.safeParse({ ...valid, status: 'ABERTO' }).success).toBe(false);
  });
  it('AUTH-01 senha preserva espaços e login normaliza', () => {
    expect(loginInputSchema.parse({ username: 'ANA', password: ' senha ' })).toEqual({
      username: 'ana',
      password: ' senha ',
    });
  });
  it('REQ-08/09 transições e repetição, sem salto ou reabertura', () => {
    expect(canAdvance('ABERTO', 'EM_ATENDIMENTO')).toBe(true);
    expect(canAdvance('EM_ATENDIMENTO', 'CONCLUIDO')).toBe(true);
    expect(canAdvance('CONCLUIDO', 'CONCLUIDO')).toBe(true);
    expect(canAdvance('ABERTO', 'CONCLUIDO')).toBe(false);
    expect(canAdvance('CONCLUIDO', 'ABERTO')).toBe(false);
  });
  it('REQ-11 início civil correto inclusive dia de horário de verão sem meia-noite', () => {
    expect(dateBoundary('2026-10-01', 'America/Sao_Paulo')).toBe('2026-10-01T03:00:00.000Z');
    expect(dateBoundary('2018-11-04', 'America/Sao_Paulo')).toBe('2018-11-04T03:00:00.000Z');
    expect(dateBoundary('2018-11-04', 'America/Sao_Paulo', true)).toBe('2018-11-05T02:00:00.000Z');
    expect(filtersSchema.safeParse({ from: '2026-02-30' }).success).toBe(false);
  });
});

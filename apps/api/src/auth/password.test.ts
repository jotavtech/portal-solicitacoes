import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';
describe('NFR-001 hashes de senha', () => {
  it('hash tem salt único; verifica senha exata sem aparar', async () => {
    const one = await hashPassword(' senha com espaços '),
      two = await hashPassword(' senha com espaços ');
    expect(one).not.toBe(two);
    expect(one).not.toContain('senha com espaços');
    expect(await verifyPassword(' senha com espaços ', one)).toBe(true);
    expect(await verifyPassword('senha com espaços', one)).toBe(false);
  });
  it('hash corrompido ou parâmetros desconhecidos não autenticam', async () => {
    expect(await verifyPassword('senha', 'texto-puro')).toBe(false);
    expect(await verifyPassword('senha', 'scrypt$1$8$3$00$00')).toBe(false);
  });
});

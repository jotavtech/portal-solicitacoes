import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 32768,
  r = 8,
  p = 3,
  length = 64;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      Buffer.from(salt, 'hex'),
      length,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, rr, pp, salt, key] = encoded.split('$');
  if (
    algorithm !== 'scrypt' ||
    n !== String(N) ||
    rr !== String(r) ||
    pp !== String(p) ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(key ?? '')
  )
    return false;
  const derived = await derive(password, salt);
  return timingSafeEqual(derived, Buffer.from(key, 'hex'));
}
// Mesmo custo para usuário desconhecido; não é credencial de uma conta.
export const dummyHash = `scrypt$${N}$${r}$${p}$${'0'.repeat(32)}$${'0'.repeat(128)}`;

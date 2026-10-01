import { Router } from 'express';
import type Database from 'better-sqlite3';
import { authenticatedSessionSchema, loginInputSchema, sessionSchema } from '@portal/contracts';
import { dummyHash, verifyPassword } from './password.js';
import { authContext, requireAuth, requireCsrf, SessionService } from './sessions.js';
import { HttpError, parse } from '../errors.js';

export function authRoutes(
  db: Database.Database,
  sessions: SessionService,
  now: () => Date,
  loginRateLimit: number,
) {
  const router = Router();
  const attempts = new Map<string, { count: number; until: number }>();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/session', (_req, res) => {
    let context = authContext(res);
    if (!context.session) context = sessions.create(res, null);
    res.json(sessionSchema.parse({ user: context.user, csrfToken: context.session!.csrf_token }));
  });
  router.post('/login', requireCsrf, async (req, res) => {
    const stamp = now().getTime(),
      ip = req.ip ?? 'unknown';
    // Limpa entradas vencidas sem manter IPs indefinidamente.
    for (const [key, entry] of attempts) if (entry.until <= stamp) attempts.delete(key);
    const entry = attempts.get(ip) ?? { count: 0, until: stamp + 60000 };
    entry.count++;
    attempts.set(ip, entry);
    if (entry.count > loginRateLimit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - stamp) / 1000))));
      throw new HttpError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto.');
    }
    const input = parse(loginInputSchema, req.body);
    const user = db
      .prepare('SELECT id,password_hash FROM users WHERE username=?')
      .get(input.username) as { id: number; password_hash: string } | undefined;
    const valid = await verifyPassword(input.password, user?.password_hash ?? dummyHash);
    if (!user || !valid)
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.');
    sessions.revoke(authContext(res));
    const context = sessions.create(res, user.id);
    res.json(
      authenticatedSessionSchema.parse({
        user: context.user,
        csrfToken: context.session!.csrf_token,
      }),
    );
  });
  router.post('/logout', requireAuth, requireCsrf, (_req, res) => {
    sessions.logout(authContext(res), res);
    res.status(204).end();
  });
  return router;
}

import type Database from 'better-sqlite3';
import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { userSchema, type User } from '@portal/contracts';
import { HttpError } from '../errors.js';

type SessionRow = {
  token_hash: string;
  user_id: number | null;
  csrf_token: string;
  created_at: string;
  expires_at: string;
};
export type AuthContext = { session: SessionRow | null; user: User | null };
export const authContext = (res: Response) => res.locals.auth as AuthContext;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export class SessionService {
  constructor(
    private db: Database.Database,
    private now: () => Date,
    private secure: boolean,
    private ttlMs: number,
  ) {}
  resolve(req: Request): AuthContext {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.['portal.sid'];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
      return { session: null, user: null };
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?')
      .get(tokenHash(token), this.now().toISOString()) as SessionRow | undefined;
    if (!row) return { session: null, user: null };
    const user =
      row.user_id === null
        ? null
        : this.db.prepare('SELECT id,username,name FROM users WHERE id=?').get(row.user_id);
    return { session: row, user: user ? userSchema.parse(user) : null };
  }
  create(res: Response, userId: number | null): AuthContext {
    const token = randomBytes(32).toString('hex'),
      csrf = randomBytes(32).toString('hex');
    const created = this.now().toISOString(),
      expires = new Date(this.now().getTime() + this.ttlMs).toISOString();
    const row: SessionRow = {
      token_hash: tokenHash(token),
      user_id: userId,
      csrf_token: csrf,
      created_at: created,
      expires_at: expires,
    };
    this.db
      .prepare('INSERT INTO sessions VALUES (?,?,?,?,?)')
      .run(row.token_hash, userId, csrf, created, expires);
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(created);
    res.cookie('portal.sid', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
      maxAge: this.ttlMs,
    });
    const user =
      userId === null
        ? null
        : userSchema.parse(
            this.db.prepare('SELECT id,username,name FROM users WHERE id=?').get(userId),
          );
    return { session: row, user };
  }
  revoke(context: AuthContext) {
    if (context.session)
      this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(context.session.token_hash);
  }
  logout(context: AuthContext, res: Response) {
    this.revoke(context);
    res.clearCookie('portal.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
    });
  }
}
export function requireAuth(_req: Request, res: Response, next: NextFunction) {
  if (!authContext(res).user)
    throw new HttpError(401, 'UNAUTHENTICATED', 'Entre para acessar o portal.');
  next();
}
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const expected = authContext(res).session?.csrf_token,
    actual = req.get('X-CSRF-Token');
  if (
    !expected ||
    !actual ||
    Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    throw new HttpError(
      403,
      'CSRF_INVALID',
      'Sua sessão mudou. Recarregue a página e tente novamente.',
    );
  next();
}

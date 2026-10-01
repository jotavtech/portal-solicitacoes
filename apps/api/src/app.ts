import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { SessionService, requireAuth } from './auth/sessions.js';
import { authRoutes } from './auth/routes.js';
import { requestRoutes } from './requests/routes.js';
import { RequestRepository } from './requests/repository.js';
import { HttpError, errorHandler } from './errors.js';

export type AppOptions = {
  db: Database.Database;
  now?: () => Date;
  cookieSecure?: boolean;
  sessionTtlMs?: number;
  timeZone?: string;
  webDirectory?: string;
  trustProxy?: boolean;
  /** Injeção exclusiva para suites que fazem muitos logins locais. Produção usa 10. */
  loginRateLimit?: number;
};
export function createApp({
  db,
  now = () => new Date(),
  cookieSecure = false,
  sessionTtlMs = 28800000,
  timeZone = 'America/Sao_Paulo',
  webDirectory,
  trustProxy = false,
  loginRateLimit = 10,
}: AppOptions) {
  const app = express(),
    sessions = new SessionService(db, now, cookieSecure, sessionTtlMs);
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  if (trustProxy) app.set('trust proxy', 'loopback');
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.set('X-Request-ID', String(res.locals.requestId));
    next();
  });
  app.use(helmet());
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    res.locals.auth = sessions.resolve(req);
    next();
  });
  // Protege antes de parsear o corpo de negócio, para não revelar validações a anônimos.
  app.use('/api', (req, res, next) => {
    if (req.path !== '/auth/session' && req.path !== '/auth/login' && !res.locals.auth.user)
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Entre para acessar o portal.'));
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/auth', authRoutes(db, sessions, now, loginRateLimit));
  app.use('/api/requests', requestRoutes(db, now, timeZone));
  app.get('/api/dashboard', requireAuth, (_req, res) =>
    res.json(new RequestRepository(db).dashboard()),
  );
  app.use('/api', (_req, _res, next) =>
    next(new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.')),
  );
  if (webDirectory) {
    app.use(express.static(webDirectory));
    app.get('/{*path}', (req, res, next) => {
      if (!req.accepts('html'))
        return next(new HttpError(404, 'NOT_FOUND', 'Página não encontrada.'));
      res.sendFile('index.html', { root: webDirectory });
    });
  }
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.')));
  app.use(errorHandler);
  return app;
}

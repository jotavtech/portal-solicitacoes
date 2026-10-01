import { Router } from 'express';
import type Database from 'better-sqlite3';
import { requestInputSchema, requestPageSchema, statusInputSchema } from '@portal/contracts';
import { authContext, requireAuth, requireCsrf } from '../auth/sessions.js';
import { parse } from '../errors.js';
import { filtersSchema, idSchema } from './filters.js';
import { RequestRepository } from './repository.js';
import { RequestService } from './service.js';

export function requestRoutes(db: Database.Database, now: () => Date, timeZone: string) {
  const router = Router(),
    repository = new RequestRepository(db),
    service = new RequestService(repository, now);
  router.use(requireAuth);
  router.get('/', (req, res) =>
    res.json(requestPageSchema.parse(repository.list(parse(filtersSchema, req.query), timeZone))),
  );
  router.post('/', requireCsrf, (req, res) =>
    res
      .status(201)
      .json(
        repository.create(
          parse(requestInputSchema, req.body),
          authContext(res).user!.id,
          now().toISOString(),
        ),
      ),
  );
  router.get('/:id', (req, res) => res.json(service.get(parse(idSchema, req.params.id))));
  router.put('/:id', requireCsrf, (req, res) =>
    res.json(
      service.update(
        parse(idSchema, req.params.id),
        authContext(res).user!.id,
        parse(requestInputSchema, req.body),
      ),
    ),
  );
  router.delete('/:id', requireCsrf, (req, res) => {
    service.delete(parse(idSchema, req.params.id), authContext(res).user!.id);
    res.status(204).end();
  });
  router.patch('/:id/status', requireCsrf, (req, res) =>
    res.json(
      service.changeStatus(
        parse(idSchema, req.params.id),
        parse(statusInputSchema, req.body).status,
      ),
    ),
  );
  return router;
}

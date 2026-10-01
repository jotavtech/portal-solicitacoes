import type { InternalRequest, RequestInput, Status } from '@portal/contracts';
import { HttpError } from '../errors.js';
import { RequestRepository } from './repository.js';

export function canAdvance(from: Status, to: Status) {
  return (
    from === to ||
    (from === 'ABERTO' && to === 'EM_ATENDIMENTO') ||
    (from === 'EM_ATENDIMENTO' && to === 'CONCLUIDO')
  );
}
export class RequestService {
  constructor(
    private repository: RequestRepository,
    private now: () => Date,
  ) {}
  get(id: number) {
    const row = this.repository.find(id);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
    return row;
  }
  private requireOwnerOpen(row: InternalRequest, author: number) {
    if (row.requester.id !== author)
      throw new HttpError(403, 'FORBIDDEN', 'Somente o solicitante pode editar ou excluir.');
    if (row.status !== 'ABERTO')
      throw new HttpError(
        409,
        'REQUEST_NOT_OPEN',
        'Somente solicitações abertas podem ser editadas ou excluídas.',
      );
  }
  update(id: number, author: number, input: RequestInput) {
    this.requireOwnerOpen(this.get(id), author);
    if (!this.repository.updateOpen(id, author, input, this.now().toISOString())) {
      this.requireOwnerOpen(this.get(id), author);
      throw new HttpError(409, 'CONFLICT', 'A solicitação mudou. Recarregue e tente novamente.');
    }
    return this.get(id);
  }
  delete(id: number, author: number) {
    this.requireOwnerOpen(this.get(id), author);
    if (!this.repository.deleteOpen(id, author)) {
      this.requireOwnerOpen(this.get(id), author);
      throw new HttpError(409, 'CONFLICT', 'A solicitação mudou. Recarregue e tente novamente.');
    }
  }
  changeStatus(id: number, to: Status) {
    const row = this.get(id);
    if (!canAdvance(row.status, to))
      throw new HttpError(
        409,
        'INVALID_TRANSITION',
        'Avance para o próximo status. Solicitações concluídas não podem ser reabertas.',
      );
    if (row.status === to) return row;
    if (!this.repository.advance(id, row.status, to, this.now().toISOString()))
      throw new HttpError(409, 'CONFLICT', 'O status mudou. Recarregue e tente novamente.');
    return this.get(id);
  }
}

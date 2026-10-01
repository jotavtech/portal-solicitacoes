import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, ChevronRight, Check, CheckCircle2 } from 'lucide-react';
import { statuses, statusLabels, categoryLabels, type Status } from '@portal/contracts';
import { useAuth } from '../auth.js';
import { useRequest } from '../lib/useRequest.js';
import { api, formatDate, messageOf } from '../lib/api.js';
import { Back } from '../components/Back.js';
import { DeleteConfirmation, ErrorPanel, Loading, StatusBadge } from '../components/Shared.js';
export function DetailPage() {
  const { id } = useParams(),
    { row, setRow, loading, error, retry } = useRequest(id),
    { session } = useAuth(),
    navigate = useNavigate(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Back />
        <ErrorPanel message={error} onRetry={retry} />
      </>
    );
  if (!row) return null;
  const ownOpen = row.status === 'ABERTO' && row.requester.id === session.user?.id,
    next: Status | null =
      row.status === 'ABERTO'
        ? 'EM_ATENDIMENTO'
        : row.status === 'EM_ATENDIMENTO'
          ? 'CONCLUIDO'
          : null;
  return (
    <>
      <Back />
      <div className="page-heading detail-heading">
        <div>
          <span className="eyebrow">SOLICITAÇÃO #{String(row.id).padStart(4, '0')}</span>
          <h1>{row.title}</h1>
          <p>
            Registrada por {row.requester.name} em {formatDate(row.createdAt)}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="detail-grid">
        <article className="card detail-description">
          <span className="eyebrow">DESCRIÇÃO</span>
          <p className="description-text">{row.description}</p>
        </article>
        <aside className="card detail-info">
          <h2>Sobre esta solicitação</h2>
          <dl>
            <div>
              <dt>Categoria</dt>
              <dd>{categoryLabels[row.category]}</dd>
            </div>
            <div>
              <dt>Solicitante</dt>
              <dd>{row.requester.name}</dd>
            </div>
            <div>
              <dt>Data de abertura</dt>
              <dd>{formatDate(row.createdAt)}</dd>
            </div>
            <div>
              <dt>Última atualização</dt>
              <dd>{formatDate(row.updatedAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>
      <div className="card progress-card">
        <h2>Acompanhe o andamento</h2>
        <div className="progress-steps">
          {statuses.map((status, index) => {
            const current = statuses.indexOf(row.status),
              done = index <= current;
            return (
              <div key={status} className={done ? 'step done' : 'step'}>
                <span>{done ? <Check size={15} aria-hidden="true" /> : index + 1}</span>
                <strong>{statusLabels[status]}</strong>
              </div>
            );
          })}
        </div>
        {actionError && !confirm && <ErrorPanel message={actionError} />}
        <div className="detail-actions">
          <div>
            {ownOpen && (
              <>
                <Link className="button secondary" to={`/requests/${row.id}/edit`}>
                  <Pencil size={16} aria-hidden="true" />
                  Editar
                </Link>
                <button
                  className="button quiet-danger"
                  disabled={busy}
                  onClick={() => {
                    setActionError('');
                    setConfirm(true);
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir
                </button>
              </>
            )}
          </div>
          {next ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setActionError('');
                try {
                  setRow(await api.changeStatus(row.id, next));
                } catch (error) {
                  setActionError(messageOf(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? 'Atualizando...'
                : next === 'EM_ATENDIMENTO'
                  ? 'Iniciar atendimento'
                  : 'Concluir solicitação'}
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ) : (
            <span className="completed-note">
              <CheckCircle2 size={18} aria-hidden="true" />
              Atendimento concluído
            </span>
          )}
        </div>
      </div>
      {confirm && (
        <DeleteConfirmation
          title={row.title}
          busy={busy}
          error={actionError}
          onCancel={() => {
            setConfirm(false);
            setActionError('');
          }}
          onConfirm={async () => {
            setBusy(true);
            setActionError('');
            try {
              await api.delete(row.id);
              navigate('/requests');
            } catch (error) {
              setActionError(messageOf(error));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}

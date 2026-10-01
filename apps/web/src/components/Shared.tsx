import { useEffect, useRef } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { statusLabels, type Dashboard, type Status } from '@portal/contracts';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={20} aria-hidden="true" />
      {label}
    </div>
  );
}
export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button className="button secondary small" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export function DashboardCards({
  data,
  loading,
  error,
  onRetry,
}: {
  data?: Dashboard;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  const cards = [
    ['total', 'Total de solicitações'],
    ['open', 'Abertas'],
    ['inProgress', 'Em atendimento'],
    ['completed', 'Concluídas'],
  ] as const;
  return (
    <section className="dashboard" aria-label="Indicadores gerais">
      <div className="section-caption">
        <span>Indicadores gerais</span>
        <span>Visão de todas as solicitações</span>
      </div>
      {error ? (
        <ErrorPanel message={error} onRetry={onRetry} />
      ) : loading ? (
        <Loading label="Carregando indicadores..." />
      ) : (
        data && (
          <div className="stat-grid">
            {cards.map(([key, label]) => (
              <article className={`stat-card stat-${key}`} key={key}>
                <div className="stat-label">{label}</div>
                <strong>{data[key]}</strong>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}
export function DeleteConfirmation({
  title,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null),
    cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      prior?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-heading"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel();
          if (event.key === 'Tab') {
            const nodes =
              dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            if (!nodes?.length) {
              event.preventDefault();
              return;
            }
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <span className="danger-icon">
          <AlertCircle size={24} aria-hidden="true" />
        </span>
        <h2 id="delete-heading">Excluir solicitação?</h2>
        <p>
          A solicitação <strong>“{title}”</strong> será removida. Esta ação não pode ser desfeita.
        </p>
        {error && <ErrorPanel message={error} />}
        <div className="form-actions">
          <button ref={cancel} className="button secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
          <button className="button danger" disabled={busy} onClick={onConfirm}>
            {busy ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ClipboardList, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  categories,
  categoryLabels,
  statuses,
  statusLabels,
  type Dashboard,
  type RequestPage,
} from '@portal/contracts';
import { DashboardCards, ErrorPanel, Loading, StatusBadge } from '../components/Shared.js';
import { api, formatDate, messageOf } from '../lib/api.js';
const emptyFilters = { q: '', category: '', status: '', from: '', to: '' };
export function RequestsPage() {
  const [draft, setDraft] = useState(emptyFilters),
    [filters, setFilters] = useState(emptyFilters),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [list, setList] = useState<RequestPage>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [dashboard, setDashboard] = useState<Dashboard>(),
    [dashLoading, setDashLoading] = useState(true),
    [dashError, setDashError] = useState(''),
    [dashRetry, setDashRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setDashLoading(true);
    setDashError('');
    api
      .dashboard()
      .then((value) => {
        if (active) setDashboard(value);
      })
      .catch((error) => {
        if (active) setDashError(messageOf(error));
      })
      .finally(() => {
        if (active) setDashLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dashRetry]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    api
      .list(query)
      .then((value) => {
        if (active) setList(value);
      })
      .catch((error) => {
        if (active) setError(messageOf(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, retry]);
  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...draft });
  }
  const activeCount = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTÃO INTERNA</span>
          <h1>Solicitações internas</h1>
          <p>Registre solicitações e acompanhe o atendimento.</p>
        </div>
        <Link className="button primary" to="/requests/new">
          <Plus size={18} aria-hidden="true" />
          Nova solicitação
        </Link>
      </div>
      <DashboardCards
        data={dashboard}
        loading={dashLoading}
        error={dashError}
        onRetry={() => setDashRetry((value) => value + 1)}
      />
      <section className="list-card card">
        <div className="list-heading">
          <div>
            <h2>Todas as solicitações</h2>
          </div>
          {list && !loading && (
            <span className="count-pill">
              {list.total} {list.total === 1 ? 'solicitação' : 'solicitações'}
            </span>
          )}
        </div>
        <form className="filters" onSubmit={apply}>
          <div className="filter-search">
            <label htmlFor="search">Buscar por título</label>
            <div>
              <Search size={17} aria-hidden="true" />
              <input
                id="search"
                value={draft.q}
                onChange={(event) => setDraft({ ...draft, q: event.target.value })}
                placeholder="Pesquisar solicitações"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="filter-category">Categoria</label>
            <select
              id="filter-category"
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            >
              <option value="">Todas as categorias</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="">Todos os status</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="from">De</label>
            <input
              type="date"
              id="from"
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="to">Até</label>
            <input
              type="date"
              id="to"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </div>
          <button className="button secondary" type="submit">
            Filtrar
          </button>
        </form>
        <div className="filters-note">
          <span>
            {activeCount
              ? `${activeCount} filtro(s) aplicado(s)`
              : 'Exibindo todas as categorias e status'}{' '}
          </span>
          {activeCount > 0 && (
            <button
              className="text-button"
              onClick={() => {
                setDraft(emptyFilters);
                setFilters(emptyFilters);
                setPage(1);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
        {error ? (
          <ErrorPanel message={error} onRetry={() => setRetry((value) => value + 1)} />
        ) : loading ? (
          <Loading label="Carregando solicitações..." />
        ) : !list?.items.length ? (
          <div className="empty-state">
            <span>
              <ClipboardList size={27} aria-hidden="true" />
            </span>
            <h3>Nenhuma solicitação encontrada</h3>
            <p>
              {activeCount
                ? 'Ajuste os filtros para encontrar outras demandas.'
                : 'Comece registrando sua primeira solicitação.'}
            </p>
            {!activeCount && (
              <Link to="/requests/new" className="button secondary">
                Criar solicitação
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Solicitação</th>
                  <th>Categoria</th>
                  <th>Solicitante</th>
                  <th>Abertura</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Detalhes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.id}>
                    <td className="code">#{String(row.id).padStart(4, '0')}</td>
                    <td data-label="Título">
                      <Link className="request-title" to={`/requests/${row.id}`}>
                        {row.title}
                      </Link>
                    </td>
                    <td data-label="Categoria">
                      <span className="category-label">{categoryLabels[row.category]}</span>
                    </td>
                    <td data-label="Solicitante">{row.requester.name}</td>
                    <td className="date-cell" data-label="Abertura">
                      {formatDate(row.createdAt)}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        to={`/requests/${row.id}`}
                        aria-label={`Detalhes de ${row.title}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && !loading && !error && (
          <div className="pagination">
            <span>
              {list.total
                ? `Página ${page} de ${Math.ceil(list.total / list.pageSize)}`
                : '0 resultados'}
            </span>
            <div>
              <button
                className="button secondary small"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="button secondary small"
                aria-label="Próxima página"
                disabled={page * list.pageSize >= list.total}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

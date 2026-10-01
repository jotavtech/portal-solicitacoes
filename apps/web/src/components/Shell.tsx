import { useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth.js';
import { Brand } from './Brand.js';
import { ErrorPanel } from './Shared.js';
import { messageOf } from '../lib/api.js';
export function Shell() {
  const { session, logout } = useAuth(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (!session.user) return <Navigate to="/login" replace />;
  const user = session.user;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <Brand />
        <span className="header-context">Portal interno</span>
        <nav aria-label="Principal">
          <NavLink to="/requests">Solicitações</NavLink>
        </nav>
        <div className="header-user">
          <div>
            <strong>{user.name}</strong>
            <span>Colaborador</span>
          </div>
          <button
            className="logout-button"
            aria-label="Sair do portal"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
              } catch (error) {
                setError(messageOf(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </header>
      <div className="workspace">
        <main className="main-content" id="main-content" tabIndex={-1}>
          {error && <ErrorPanel message={error} />}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Solicita / Portal interno</span>
          <span>Solicitações e atendimento</span>
        </footer>
      </div>
    </div>
  );
}

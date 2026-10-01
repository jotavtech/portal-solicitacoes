import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth.js';
import { Brand } from '../components/Brand.js';
import { LoginForm } from '../components/Forms.js';
export function LoginPage() {
  const { session, login, notice } = useAuth();
  if (session.user) return <Navigate to="/requests" replace />;
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-copy">
          <span className="eyebrow">PORTAL INTERNO</span>
          <h1>
            Solicitações
            <br />
            internas.
          </h1>
          <p>Registre o que você precisa e acompanhe cada etapa do atendimento em um só lugar.</p>
          <ol className="story-flow" aria-label="Etapas do atendimento">
            <li>
              <span>01</span>Abertura
            </li>
            <li>
              <span>02</span>Atendimento
            </li>
            <li>
              <span>03</span>Conclusão
            </li>
          </ol>
        </div>
        <span className="login-story-footer">TI / RH / Compras / Financeiro / Infraestrutura</span>
      </section>
      <section className="login-entry">
        <div className="login-entry-inner">
          <span className="eyebrow">ACESSO DO COLABORADOR</span>
          <h2>Acessar o portal</h2>
          <p className="muted">Entre com suas credenciais para acessar o portal.</p>
          {notice && (
            <div className="notice" role="alert">
              {notice}
            </div>
          )}
          <LoginForm onSubmit={login} />
          <p className="login-help">Precisa de acesso? Fale com o responsável pelo portal.</p>
        </div>
        <footer>Portal de Solicitações Internas</footer>
      </section>
    </main>
  );
}

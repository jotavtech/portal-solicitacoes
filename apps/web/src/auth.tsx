import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@portal/contracts';
import { api, messageOf } from './lib/api.js';
import { Loading, ErrorPanel } from './components/Shared.js';

type AuthState = {
  session: Session;
  notice: string;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const load = () => {
    setError('');
    api
      .session()
      .then(setSession)
      .catch((error) => setError(messageOf(error)));
  };
  useEffect(() => {
    let mounted = true;
    api
      .session()
      .then((result) => {
        if (mounted) setSession(result);
      })
      .catch((error) => {
        if (mounted) setError(messageOf(error));
      });
    const expired = () => {
      setNotice('Sua sessão expirou. Entre novamente para continuar.');
      setSession({ user: null, csrfToken: '' });
      api
        .session()
        .then((result) => {
          if (mounted) setSession(result);
        })
        .catch((error) => {
          if (mounted) setError(messageOf(error));
        });
    };
    window.addEventListener('portal:expired', expired);
    return () => {
      mounted = false;
      window.removeEventListener('portal:expired', expired);
    };
  }, []);
  if (error)
    return (
      <main className="startup">
        <ErrorPanel message={error} onRetry={load} />
      </main>
    );
  if (!session)
    return (
      <main className="startup">
        <Loading label="Preparando o portal..." />
      </main>
    );
  return (
    <AuthContext.Provider
      value={{
        session,
        notice,
        login: async (input) => {
          setSession(await api.login(input));
          setNotice('');
        },
        logout: async () => {
          await api.logout();
          setSession({ user: null, csrfToken: '' });
          setSession(await api.session());
          setNotice('');
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import {
  categories,
  categoryLabels,
  loginInputSchema,
  requestInputSchema,
  type RequestInput,
} from '@portal/contracts';
import { ApiError, messageOf } from '../lib/api.js';
import { ErrorPanel } from './Shared.js';

type Fields = Record<string, string[]>;
function FieldError({ name, fields }: { name: string; fields: Fields }) {
  return fields[name]?.length ? (
    <span className="field-error" id={`${name}-error`}>
      {fields[name].join(' ')}
    </span>
  ) : null;
}
const invalid = (name: string, fields: Fields) => ({
  'aria-invalid': Boolean(fields[name]),
  'aria-describedby': fields[name] ? `${name}-error` : undefined,
});
function issuesToFields(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Fields = {};
  for (const issue of issues) (fields[String(issue.path[0] ?? '_form')] ??= []).push(issue.message);
  return fields;
}
export function LoginForm({
  onSubmit,
}: {
  onSubmit: (input: { username: string; password: string }) => Promise<unknown>;
}) {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Fields>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setFields({});
    const input = loginInputSchema.safeParse({ username, password });
    if (!input.success) {
      setFields(issuesToFields(input.error.issues));
      return;
    }
    setBusy(true);
    try {
      await onSubmit(input.data);
    } catch (error) {
      setError(messageOf(error));
      if (error instanceof ApiError && error.fields) setFields(error.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="login-form">
      {error && <ErrorPanel message={error} />}
      <div className="field">
        <label htmlFor="username">Usuário</label>
        <input
          id="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Seu usuário"
          {...invalid('username', fields)}
        />
        <FieldError name="username" fields={fields} />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          {...invalid('password', fields)}
        />
        <FieldError name="password" fields={fields} />
      </div>
      <button className="button primary login-submit" disabled={busy}>
        {busy ? 'Entrando...' : 'Entrar no portal'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      <div className="login-security">
        <LockKeyhole size={14} aria-hidden="true" />
        Acesso exclusivo para colaboradores
      </div>
    </form>
  );
}
export function RequestForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: RequestInput;
  onSubmit: (input: RequestInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<RequestInput>(
      initial ?? { title: '', description: '', category: 'TI' },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Fields>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setFields({});
    const input = requestInputSchema.safeParse(values);
    if (!input.success) {
      setFields(issuesToFields(input.error.issues));
      return;
    }
    setBusy(true);
    try {
      await onSubmit(input.data);
    } catch (error) {
      setError(messageOf(error));
      if (error instanceof ApiError && error.fields) setFields(error.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="request-form card" onSubmit={submit} noValidate>
      <div className="form-intro">
        <h2>Informações da solicitação</h2>
        <p>Conte o que você precisa para facilitar o atendimento.</p>
      </div>
      {error && <ErrorPanel message={error} />}
      <div className="field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          value={values.title}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          placeholder="Ex.: Acesso ao sistema financeiro"
          {...invalid('title', fields)}
        />
        <div className="field-meta">
          <FieldError name="title" fields={fields} />
          <span>{Array.from(values.title).length}/120</span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="category">Categoria</label>
        <select
          id="category"
          value={values.category}
          onChange={(event) =>
            setValues({ ...values, category: event.target.value as RequestInput['category'] })
          }
          {...invalid('category', fields)}
        >
          {categories.map((category) => (
            <option value={category} key={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </select>
        <FieldError name="category" fields={fields} />
      </div>
      <div className="field">
        <label htmlFor="description">Descrição</label>
        <textarea
          id="description"
          rows={7}
          value={values.description}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
          placeholder="Descreva a necessidade e inclua os detalhes relevantes."
          {...invalid('description', fields)}
        />
        <div className="field-meta">
          <FieldError name="description" fields={fields} />
          <span>{Array.from(values.description).length}/5000</span>
        </div>
      </div>
      <div className="form-note">
        Ao criar, a solicitação será registrada como aberta em seu nome.
      </div>
      <div className="form-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar solicitação'}
        </button>
      </div>
    </form>
  );
}

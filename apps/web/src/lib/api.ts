import type { z } from 'zod';
import {
  authenticatedSessionSchema,
  dashboardSchema,
  errorSchema,
  requestPageSchema,
  requestSchema,
  sessionSchema,
  type RequestInput,
  type Status,
} from '@portal/contracts';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
let csrfToken = '';
async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  method = 'GET',
  body?: unknown,
  signalExpiry = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    if (response.status === 401 && signalExpiry) window.dispatchEvent(new Event('portal:expired'));
    const result = errorSchema.safeParse(await response.json().catch(() => null));
    throw new ApiError(
      response.status,
      result.success ? result.data.error.message : 'Não foi possível concluir a operação.',
      result.success ? result.data.error.fields : undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  const result = schema.safeParse(await response.json());
  if (!result.success)
    throw new ApiError(0, 'O servidor retornou uma resposta inesperada. Tente novamente.');
  return result.data;
}
export const api = {
  async session() {
    const session = await call('/auth/session', sessionSchema, 'GET', undefined, false);
    csrfToken = session.csrfToken;
    return session;
  },
  async login(input: { username: string; password: string }) {
    const session = await call('/auth/login', authenticatedSessionSchema, 'POST', input, false);
    csrfToken = session.csrfToken;
    return session;
  },
  async logout() {
    await call('/auth/logout', sessionSchema, 'POST');
    csrfToken = '';
  },
  list(query: URLSearchParams) {
    return call(`/requests?${query}`, requestPageSchema);
  },
  detail(id: string) {
    return call(`/requests/${encodeURIComponent(id)}`, requestSchema);
  },
  create(input: RequestInput) {
    return call('/requests', requestSchema, 'POST', input);
  },
  update(id: number, input: RequestInput) {
    return call(`/requests/${id}`, requestSchema, 'PUT', input);
  },
  delete(id: number) {
    return call(`/requests/${id}`, requestSchema, 'DELETE');
  },
  changeStatus(id: number, status: Status) {
    return call(`/requests/${id}/status`, requestSchema, 'PATCH', { status });
  },
  dashboard() {
    return call('/dashboard', dashboardSchema);
  },
};
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
export const appTimeZone = import.meta.env.VITE_APP_TIMEZONE || 'America/Sao_Paulo';
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: appTimeZone,
  }).format(new Date(date));

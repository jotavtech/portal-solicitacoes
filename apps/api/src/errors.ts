import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_form');
    (fields[key] ??= []).push(issue.message);
  }
  throw new HttpError(422, 'VALIDATION_ERROR', 'Confira os campos informados.', fields);
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  let known = error instanceof HttpError ? error : undefined;
  if (error instanceof SyntaxError && 'status' in error && error.status === 400)
    known = new HttpError(400, 'INVALID_JSON', 'Corpo JSON inválido.');
  if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large')
    known = new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      'O conteúdo enviado excede o limite permitido.',
    );
  const requestId = String(res.locals.requestId);
  if (!known) console.error(`Falha interna na requisição ${requestId}`);
  res.status(known?.status ?? 500).json({
    error: {
      code: known?.code ?? 'INTERNAL_ERROR',
      message: known?.message ?? 'Não foi possível concluir a operação.',
      ...(known?.fields ? { fields: known.fields } : {}),
      requestId,
    },
  });
}

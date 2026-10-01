import { z } from 'zod';

export const categories = ['TI', 'RH', 'COMPRAS', 'FINANCEIRO', 'INFRAESTRUTURA'] as const;
export const statuses = ['ABERTO', 'EM_ATENDIMENTO', 'CONCLUIDO'] as const;
export const categoryLabels: Record<(typeof categories)[number], string> = {
  TI: 'TI',
  RH: 'RH',
  COMPRAS: 'Compras',
  FINANCEIRO: 'Financeiro',
  INFRAESTRUTURA: 'Infraestrutura',
};
export const statusLabels: Record<(typeof statuses)[number], string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em Atendimento',
  CONCLUIDO: 'Concluído',
};
const text = (min: number, max: number, trim = true) => {
  const schema = trim ? z.string().trim() : z.string();
  return schema.refine(
    (value) => Array.from(value).length >= min && Array.from(value).length <= max,
    `Use entre ${min} e ${max} caracteres.`,
  );
};
export const categorySchema = z.enum(categories, { error: 'Selecione uma categoria válida.' });
export const statusSchema = z.enum(statuses, { error: 'Selecione um status válido.' });
export const loginInputSchema = z.strictObject({
  username: z
    .string()
    .min(3, 'Informe um usuário válido.')
    .max(50)
    .regex(/^[A-Za-z0-9_.-]+$/)
    .toLowerCase(),
  password: text(1, 256, false),
});
export const requestInputSchema = z.strictObject({
  title: text(3, 120),
  description: text(10, 5000),
  category: categorySchema,
});
export const statusInputSchema = z.strictObject({ status: statusSchema });
export const userSchema = z.strictObject({
  id: z.number().int().positive(),
  username: z.string(),
  name: z.string(),
});
export const sessionSchema = z.strictObject({
  user: userSchema.nullable(),
  csrfToken: z.string().min(32),
});
export const authenticatedSessionSchema = z.strictObject({
  user: userSchema,
  csrfToken: z.string().min(32),
});
export const requestSchema = z.strictObject({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  category: categorySchema,
  requester: userSchema,
  status: statusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const requestPageSchema = z.strictObject({
  items: z.array(requestSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});
export const dashboardSchema = z.strictObject({
  total: z.number().int().nonnegative(),
  open: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
});
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type InternalRequest = z.infer<typeof requestSchema>;
export type RequestInput = z.infer<typeof requestInputSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
export type RequestPage = z.infer<typeof requestPageSchema>;

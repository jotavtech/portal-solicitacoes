import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { categorySchema, statusSchema } from '@portal/contracts';

const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data válida.')
  .refine((value) => {
    try {
      Temporal.PlainDate.from(value);
      return true;
    } catch {
      return false;
    }
  }, 'Data inexistente.');
const integer = (max: number) =>
  z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(max));
export const idSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));
export const filtersSchema = z
  .strictObject({
    q: z
      .string()
      .trim()
      .refine((value) => Array.from(value).length <= 120, 'Use no máximo 120 caracteres.')
      .optional(),
    category: categorySchema.optional(),
    status: statusSchema.optional(),
    from: civilDate.optional(),
    to: civilDate.optional(),
    page: integer(Number.MAX_SAFE_INTEGER).default(1),
    pageSize: integer(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'Data inicial deve ser anterior ou igual à final.',
    path: ['to'],
  });
export type Filters = z.infer<typeof filtersSchema>;
export function dateBoundary(date: string, timeZone: string, nextDay = false) {
  let day = Temporal.PlainDate.from(date);
  if (nextDay) day = day.add({ days: 1 });
  return day.toZonedDateTime(timeZone).toInstant().toString({ fractionalSecondDigits: 3 });
}

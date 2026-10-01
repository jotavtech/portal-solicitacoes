import { config } from 'dotenv';
import { z } from 'zod';
config({ quiet: true });
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const boolean = z.enum(['true', 'false']).transform((value) => value === 'true');
  const parsed = z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
      DATABASE_PATH: z.string().min(1).default('./data/portal.sqlite'),
      APP_TIMEZONE: z
        .string()
        .refine((value) => {
          try {
            new Intl.DateTimeFormat('pt-BR', { timeZone: value });
            return true;
          } catch {
            return false;
          }
        }, 'Fuso inválido.')
        .default('America/Sao_Paulo'),
      SESSION_TTL_SECONDS: z.coerce.number().int().positive().max(86400).default(28800),
      COOKIE_SECURE: boolean.optional(),
      TRUST_PROXY_LOOPBACK: boolean.default(false),
      DEMO_SEED_ENABLED: boolean.default(false),
    })
    .parse(env);
  const secure = parsed.COOKIE_SECURE ?? parsed.NODE_ENV === 'production';
  if (parsed.NODE_ENV === 'production' && !secure)
    throw new Error('Produção exige COOKIE_SECURE=true e acesso HTTPS.');
  return { ...parsed, COOKIE_SECURE: secure };
}

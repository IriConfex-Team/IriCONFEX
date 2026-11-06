import { z } from 'zod';

const EsquemaEntorno = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().default(''),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
});

export interface Config {
  puerto: number;
  entorno: 'development' | 'test' | 'production';
  origenesCors: string[];
  databaseUrl: string;
}

export function leerConfig(entorno: NodeJS.ProcessEnv = process.env): Config {
  const resultado = EsquemaEntorno.safeParse(entorno);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((p) => p.path.join('.') + ': ' + p.message)
      .join('; ');
    throw new Error('Configuración inválida: ' + problemas);
  }
  const e = resultado.data;
  return {
    puerto: e.PORT,
    entorno: e.NODE_ENV,
    origenesCors: e.CORS_ORIGINS.split(',')
      .map((origen) => origen.trim())
      .filter((origen) => origen !== ''),
    databaseUrl: e.DATABASE_URL,
  };
}
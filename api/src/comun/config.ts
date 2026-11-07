import { z } from 'zod';

const EsquemaEntorno = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().default(''),
  RUTA_CONFIG: z.string().default('../datos/categorias/pijamas.json'),
  WHATSAPP_NEGOCIO: z.string().default(''),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
});

export interface Config {
  puerto: number;
  entorno: 'development' | 'test' | 'production';
  origenesCors: string[];
  rutaConfiguracion: string;
  whatsappNegocio: string;
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

  const origenesCors = e.CORS_ORIGINS.split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen !== '');

  if (e.NODE_ENV === 'production') {
    if (origenesCors.length === 0) {
      throw new Error('Configuración inválida: CORS_ORIGINS es obligatorio en producción');
    }
    // Un origen válido es https://dominio (sin barra final, sin ruta, sin comodín)
    const invalidos = origenesCors.filter((o) => !/^https:\/\/[^/\s*]+$/.test(o));
    if (invalidos.length > 0) {
      throw new Error(
        'Configuración inválida: CORS_ORIGINS en producción debe ser https://dominio sin "/" final ni "*" (' +
          invalidos.join(', ') +
          ')',
      );
    }
  }

  return {
    puerto: e.PORT,
    entorno: e.NODE_ENV,
    origenesCors,
    databaseUrl: e.DATABASE_URL,
    rutaConfiguracion: e.RUTA_CONFIG,
    whatsappNegocio: e.WHATSAPP_NEGOCIO
  };
}
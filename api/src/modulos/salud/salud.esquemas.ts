import { z } from '../../comun/zod.js';

export const RespuestaSaludSchema = z
  .object({
    estado: z.enum(['ok', 'degradado']).openapi({ example: 'ok' }),
    baseDatos: z.enum(['ok', 'caida']).openapi({ example: 'ok' }),
    version: z.string().openapi({ example: '0.1.0' }),
    hora: z.string().openapi({ format: 'date-time', example: '2026-11-05T14:30:00.000Z' }),
  })
  .openapi('RespuestaSalud');

export type RespuestaSalud = z.infer<typeof RespuestaSaludSchema>;
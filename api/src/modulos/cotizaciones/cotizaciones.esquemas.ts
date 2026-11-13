import { z } from '../../comun/zod.js';

export const esquemaCotizacion = z.strictObject({
  categoria: z.string().min(1),
  seleccion: z.record(z.string(), z.string()),
});
export type CotizacionWeb = z.infer<typeof esquemaCotizacion>;

export const RespuestaCotizacionSchema = z
  .object({
    estado: z.enum(['estimado', 'a_confirmar', 'incompleto']).openapi({
      description:
        'estimado: hay precio · a_confirmar: falta un precio en la tabla · incompleto: aún no eligió lo necesario',
    }),
    precioEstimadoCrc: z.number().int().nullable().openapi({ example: 11500 }),
    moneda: z.literal('CRC'),
    lineas: z.array(
      z.object({
        tipo: z.enum(['pieza', 'adicional']),
        codigo: z.string().openapi({ example: 'blusa_camisa' }),
        montoCrc: z.number().int().nullable(),
      }),
    ),
  })
  .openapi('RespuestaCotizacion');
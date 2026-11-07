import { esquemaSolicitud, type SolicitudCotizacion } from '@iriconfex/shared';
import { z } from '../../comun/zod.js';

export { esquemaSolicitud };
export type SolicitudWeb = SolicitudCotizacion;

export const RespuestaSolicitudSchema = z
  .object({
    referencia: z.string().openapi({ example: 'IC-7K3M9QX2' }),
    mensaje: z.string().openapi({ description: 'Texto listo para enviar por WhatsApp' }),
    enlaceWhatsapp: z.string().openapi({ example: 'https://wa.me/50683413594?text=...' }),
  })
  .openapi('RespuestaSolicitud');

export type RespuestaSolicitud = z.infer<typeof RespuestaSolicitudSchema>;

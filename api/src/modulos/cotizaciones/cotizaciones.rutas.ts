import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validar } from '../../comun/validar.js';
import type { CotizacionesController } from './cotizaciones.controlador.js';
import { esquemaCotizacion } from './cotizaciones.esquemas.js';

export interface OpcionesRutaCotizaciones {
  limite?: number;
}

export function crearCotizacionesRouter(
  controlador: CotizacionesController,
  { limite = 120 }: OpcionesRutaCotizaciones = {},
): Router {
  const router = Router();
  // La web recalcula al cambiar cada elección: el límite es mucho más holgado que el de solicitudes
  const limitador = rateLimit({
    windowMs: 60 * 1000,
    limit: limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'Demasiadas consultas seguidas. Espera un momento.' },
      });
    },
  });
  router.post('/', limitador, validar({ body: esquemaCotizacion }), controlador.cotizar);
  return router;
}
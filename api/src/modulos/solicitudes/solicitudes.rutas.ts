import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validar } from '../../comun/validar.js';
import type { SolicitudesController } from './solicitudes.controlador.js';
import { esquemaSolicitud } from './solicitudes.esquemas.js';

export interface OpcionesRutaSolicitudes {
  limite?: number;
}

export function crearSolicitudesRouter(
  controlador: SolicitudesController,
  { limite = 20 }: OpcionesRutaSolicitudes = {},
): Router {
  const router = Router();
  const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          codigo: 'DEMASIADAS_SOLICITUDES',
          mensaje: 'Demasiados envíos seguidos. Intenta de nuevo en unos minutos.',
        },
      });
    },
  });
  router.post('/', limitador, validar({ body: esquemaSolicitud }), controlador.crear);
  return router;
}

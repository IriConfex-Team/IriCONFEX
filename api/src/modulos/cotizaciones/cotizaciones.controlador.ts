import type { Request, Response } from 'express';
import { entrada } from '../../comun/validar.js';
import type { CotizacionWeb } from './cotizaciones.esquemas.js';
import type { CotizacionesService } from './cotizaciones.servicio.js';

export function crearCotizacionesController(servicio: CotizacionesService) {
  return {
    async cotizar(_req: Request, res: Response): Promise<void> {
      const { body } = entrada<{ body: CotizacionWeb }>(res);
      res.status(200).json(await servicio.cotizar(body));
    },
  };
}

export type CotizacionesController = ReturnType<typeof crearCotizacionesController>;
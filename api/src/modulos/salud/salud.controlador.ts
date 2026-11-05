import type { Request, Response } from 'express';
import type { SaludService } from './salud.servicio.js';

export function crearSaludController(servicio: SaludService) {
  return {
    async obtener(_req: Request, res: Response): Promise<void> {
      const salud = await servicio.obtenerEstado();
      res.status(salud.estado === 'ok' ? 200 : 503).json(salud);
    },
  };
}

export type SaludController = ReturnType<typeof crearSaludController>;
import type { Request, Response } from 'express';
import { entrada } from '../../comun/validar.js';
import type { SolicitudWeb } from './solicitudes.esquemas.js';
import type { SolicitudesService } from './solicitudes.servicio.js';

export function crearSolicitudesController(servicio: SolicitudesService) {
  return {
    async crear(_req: Request, res: Response): Promise<void> {
      const { body } = entrada<{ body: SolicitudWeb }>(res);
      res.status(201).json(await servicio.crear(body));
    },
  };
}

export type SolicitudesController = ReturnType<typeof crearSolicitudesController>;

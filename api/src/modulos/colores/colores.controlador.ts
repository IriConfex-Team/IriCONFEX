import type { Request, Response } from 'express';
import type { ColoresService } from './colores.servicio.js';

export interface ColoresController {
  listar(req: Request, res: Response): Promise<void>;
}

export function crearColoresController(servicio: ColoresService): ColoresController {
  return {
    listar: async (req, res) => {
      const tela = String(req.query.tela ?? '');
      const colores = await servicio.obtenerPorTela(tela);
      res.json({ datos: colores });
    },
  };
}
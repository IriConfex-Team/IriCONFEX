import type { Request, Response } from 'express';
import { entrada } from '../../comun/validar.js';
import type { ParamsCategoria } from './categorias.esquemas.js';
import type { CategoriasService } from './categorias.servicio.js';

export function crearCategoriasController(servicio: CategoriasService) {
  return {
    async listar(_req: Request, res: Response): Promise<void> {
      res.json({ categorias: await servicio.listar() });
    },
    async obtener(_req: Request, res: Response): Promise<void> {
      const { params } = entrada<{ params: ParamsCategoria }>(res);
      res.json(await servicio.obtener(params.codigo));
    },
  };
}

export type CategoriasController = ReturnType<typeof crearCategoriasController>;
import { Router } from 'express';
import { validar } from '../../comun/validar.js';
import type { ColoresController } from './colores.controlador.js';
import { QueryColoresSchema } from './colores.esquemas.js';

export function crearColoresRouter(controlador: ColoresController): Router {
  const router = Router();
  router.get('/', validar({ query: QueryColoresSchema }), controlador.listar);
  return router;
}
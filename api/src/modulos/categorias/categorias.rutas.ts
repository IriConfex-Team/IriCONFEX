import { Router } from 'express';
import { validar } from '../../comun/validar.js';
import type { CategoriasController } from './categorias.controlador.js';
import { ParamsCategoriaSchema } from './categorias.esquemas.js';

export function crearCategoriasRouter(controlador: CategoriasController): Router {
  const router = Router();
  router.get('/', controlador.listar);
  router.get('/:codigo', validar({ params: ParamsCategoriaSchema }), controlador.obtener);
  return router;
}
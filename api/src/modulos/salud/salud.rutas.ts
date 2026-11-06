import { Router } from 'express';
import type { SaludController } from './salud.controlador.js';

export function crearSaludRouter(controlador: SaludController): Router {
  const router = Router();
  router.get('/', controlador.obtener);
  return router;
}
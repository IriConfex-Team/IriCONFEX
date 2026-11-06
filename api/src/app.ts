import cors from 'cors';
import express, { Router, type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { manejadorErrores, noEncontrado } from './comun/manejadores.js';
import type { Dependencias } from './contenedor.js';
import { documentoOpenApi } from './docs/openapi.js';
import { crearCategoriasController } from './modulos/categorias/categorias.controlador.js';
import { crearCategoriasRouter } from './modulos/categorias/categorias.rutas.js';
import { crearSaludController } from './modulos/salud/salud.controlador.js';
import { crearSaludRouter } from './modulos/salud/salud.rutas.js';

export interface OpcionesApp {
  origenesCors?: string[];
}

export function crearApp(dependencias: Dependencias, opciones: OpcionesApp = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: opciones.origenesCors?.length ? opciones.origenesCors : false }));
  app.use(express.json({ limit: '100kb' }));

  const api = Router();
  api.use('/health', crearSaludRouter(crearSaludController(dependencias.salud)));
  api.use('/categorias', crearCategoriasRouter(crearCategoriasController(dependencias.categorias)));
  api.get('/openapi.json', (_req, res) => {
    res.json(documentoOpenApi);
  });
  api.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(documentoOpenApi as unknown as Record<string, unknown>, {
      customSiteTitle: 'IriConfex API',
    }),
  );

  app.use('/api', api);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}
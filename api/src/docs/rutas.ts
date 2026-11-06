import { z } from '../comun/zod.js';
import {
  CategoriaSchema,
  ListaCategoriasSchema,
  ParamsCategoriaSchema,
} from '../modulos/categorias/categorias.esquemas.js';
import { RespuestaSaludSchema } from '../modulos/salud/salud.esquemas.js';
import { registro } from './registro.js';

const ErrorSchema = registro.register(
  'Error',
  z.object({
    error: z.object({
      codigo: z.string().openapi({ example: 'NO_ENCONTRADO' }),
      mensaje: z.string().openapi({ example: 'La categoría «xyz» no existe' }),
      detalles: z
        .array(z.object({ campo: z.string(), mensaje: z.string() }))
        .optional(),
    }),
  }),
);

const respuestaError = (descripcion: string) => ({
  description: descripcion,
  content: { 'application/json': { schema: ErrorSchema } },
});

registro.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Salud'],
  summary: 'Estado de la API y de la base de datos',
  description: 'Consulta la base de datos con SELECT 1. Devuelve 503 si no responde.',
  responses: {
    200: {
      description: 'La API y la base de datos funcionan',
      content: { 'application/json': { schema: RespuestaSaludSchema } },
    },
    503: {
      description: 'La API responde, pero la base de datos no',
      content: { 'application/json': { schema: RespuestaSaludSchema } },
    },
  },
});

registro.registerPath({
  method: 'get',
  path: '/api/categorias',
  tags: ['Categorías'],
  summary: 'Lista las categorías activas',
  responses: {
    200: {
      description: 'Categorías disponibles, ordenadas',
      content: { 'application/json': { schema: ListaCategoriasSchema } },
    },
  },
});

registro.registerPath({
  method: 'get',
  path: '/api/categorias/{codigo}',
  tags: ['Categorías'],
  summary: 'Obtiene una categoría por su código',
  request: { params: ParamsCategoriaSchema },
  responses: {
    200: {
      description: 'La categoría pedida',
      content: { 'application/json': { schema: CategoriaSchema } },
    },
    400: respuestaError('El código tiene un formato inválido'),
    404: respuestaError('La categoría no existe'),
  },
});
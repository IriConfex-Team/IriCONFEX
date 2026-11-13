import { z } from '../comun/zod.js';
import {CategoriaSchema,ListaCategoriasSchema,ParamsCategoriaSchema,} from '../modulos/categorias/categorias.esquemas.js';
import {RespuestaCotizacionSchema,esquemaCotizacion,} from '../modulos/cotizaciones/cotizaciones.esquemas.js';
import { RespuestaSaludSchema } from '../modulos/salud/salud.esquemas.js';
import { registro } from './registro.js';
import {RespuestaSolicitudSchema,esquemaSolicitud,} from '../modulos/solicitudes/solicitudes.esquemas.js';

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

const SolicitudCotizacionDoc = z
  .object({
    categoria: z.string().openapi({ example: 'pijamas' }),
    seleccion: z
      .record(z.string(), z.string())
      .openapi({ example: { perfil: 'bebe', escote: 'redondo' } }),
    contacto: z.object({
      nombre: z.string(),
      telefono: z.string(),
    }),
    consentimiento: z.object({
      aceptado: z.literal(true),
      fecha: z.string().openapi({ format: 'date-time' }),
    }),
    medidas: z.record(z.string(), z.number()).optional(),
  })
  .openapi('SolicitudCotizacion');

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

registro.registerPath({
  method: 'post',
  path: '/api/solicitudes',
  tags: ['Solicitudes'],
  summary: 'Envía una solicitud de cotización',
  description:
    'Valida la solicitud, la registra (si el registro falla, igual responde 201) y devuelve el mensaje de WhatsApp armado por el servidor.',
  request: {
    body: { content: { 'application/json': { schema: esquemaSolicitud } } },
  },
  responses: {
    201: {
      description: 'Solicitud procesada',
      content: { 'application/json': { schema: RespuestaSolicitudSchema } },
    },
    400: respuestaError('Cuerpo inválido (VALIDACION) o selección que viola las reglas (SELECCION_INVALIDA)'),
    429: respuestaError('Demasiados envíos seguidos desde la misma IP'),
  },
});

registro.registerPath({
  method: 'post',
  path: '/api/quotes',
  tags: ['Cotizaciones'],
  summary: 'Calcula el precio estimado de una selección',
  description:
    'Suma piezas + adicionales del Anexo B en el servidor. estado=estimado trae el total; a_confirmar significa que falta algún precio en la tabla; incompleto, que el cliente aún no elige lo necesario para calcular.',
  request: {
    body: { content: { 'application/json': { schema: esquemaCotizacion } } },
  },
  responses: {
    200: {
      description: 'Resultado del cálculo',
      content: { 'application/json': { schema: RespuestaCotizacionSchema } },
    },
    400: respuestaError('Cuerpo inválido (VALIDACION) o selección que viola las reglas (SELECCION_INVALIDA)'),
    429: respuestaError('Demasiadas consultas seguidas desde la misma IP'),
  },
});
import type { Dependencias } from '../src/contenedor.js';
import type { DetalleError } from '../src/comun/errores.js';
import { crearCotizacionesService } from '../src/modulos/cotizaciones/cotizaciones.servicio.js';
import type { Categoria } from '../src/modulos/categorias/categorias.esquemas.js';
import { crearCategoriasService } from '../src/modulos/categorias/categorias.servicio.js';
import { crearSaludService } from '../src/modulos/salud/salud.servicio.js';
import type { RegistroSolicitud } from '../src/modulos/solicitudes/solicitudes.tipos.js';
import { crearSolicitudesService } from '../src/modulos/solicitudes/solicitudes.servicio.js';
// ✅ NUEVO: Importar el servicio de colores (verifica la ruta exacta en tu proyecto)
import { crearColoresService } from '../src/modulos/colores/colores.servicio.js';
import { catalogoDePrueba } from './catalogo-csv.js';

export const CATEGORIAS_DE_PRUEBA: Categoria[] = [
  { codigo: 'pijamas', nombre: 'Arma tu pijama', imagenUrl: null },
  { codigo: 'camisas', nombre: 'Camisas', imagenUrl: '/img/camisas.png' },
];

export const CONFIG_MENSAJE_DE_PRUEBA = {
  pasos: [
    { id: 'perfil', nombre: '¿Para quién es?', opciones: [{ id: 'bebe', nombre: 'Bebé' }] },
    { id: 'escote', nombre: 'Escote', opciones: [{ id: 'redondo', nombre: 'Redondo' }] },
    {
      id: 'modalidad-talla',
      nombre: '¿Cómo eliges la talla?',
      opciones: [{ id: 'medida', nombre: 'Mis medidas' }],
    },
    {
      id: 'entrega',
      nombre: '¿Cómo recibes tu pijama?',
      opciones: [{ id: 'retiro', nombre: 'Retiro en el local' }],
    },
  ],
  secciones: [
    { titulo: 'Perfil', pasos: ['perfil'] },
    { titulo: 'Parte superior', pasos: ['escote'] },
    { titulo: 'Tallaje', pasos: ['modalidad-talla'] },
    { titulo: 'Entrega', pasos: ['entrega'] },
  ],
  pasoMedidas: 'modalidad-talla',
  nombresMedida: { 'ancho-espalda': 'Ancho de espalda' },
};

interface Opciones {
  baseOk?: boolean;
  categorias?: Categoria[];
  registroFalla?: boolean;
  reglas?: string[];
  registros?: RegistroSolicitud[];
  /** Problemas que reporta la revisión de reglas al cotizar (HU-18) */
  problemasCotizacion?: DetalleError[];
}

export function dependenciasFalsas({
  baseOk = true,
  categorias = CATEGORIAS_DE_PRUEBA,
  registroFalla = false,
  reglas = [],
  registros = [],
  problemasCotizacion = [],
}: Opciones = {}): Dependencias {
  return {
    salud: crearSaludService(
      { verificarConexion: async () => baseOk },
      { version: 'test' },
    ),
    categorias: crearCategoriasService({
      listarActivas: async () => categorias,
      buscarPorCodigo: async (codigo) =>
        categorias.find((c) => c.codigo === codigo) ?? null,
    }),

    // Usa los precios REALES del Anexo B (los CSV del seed), sin base de datos
    cotizaciones: crearCotizacionesService({
      repositorio: {
        obtenerCatalogo: async () => catalogoDePrueba(),
      },
      revisarSeleccion: () => problemasCotizacion,
    }),

    solicitudes: crearSolicitudesService({
      repositorio: {
        registrar: async (registro) => {
          // Simula un error de Prisma que filtra datos personales en su mensaje
          if (registroFalla) {
            throw new Error('falló al guardar a ' + registro.nombreCliente);
          }
          registros.push(registro);
        },
      },
      verificarReglas: async () => reglas,
      configMensaje: CONFIG_MENSAJE_DE_PRUEBA,
      numeroWhatsapp: '83413594',
      version: 'test',
    }),

    // ✅ NUEVO: Instanciar el servicio de colores con su repositorio falso
     colores: crearColoresService({
      listarPorTela: async () => [], 
    }),
  };
}
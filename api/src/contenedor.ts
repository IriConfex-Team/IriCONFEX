import type { PrismaClient } from '../generated/prisma/client.js';
import type { ConfiguracionNegocio } from './comun/configuracion.js';
import { crearCategoriasRepository } from './modulos/categorias/categorias.repositorio.js';
import {
  crearCategoriasService,
  type CategoriasService,
} from './modulos/categorias/categorias.servicio.js';
import { crearColoresRepository } from './modulos/colores/colores.repositorio.js';
import {
  crearColoresService,
  type ColoresService,
} from './modulos/colores/colores.servicio.js';
import { crearCotizacionesRepository } from './modulos/cotizaciones/cotizaciones.repositorio.js';
import { revisarSeleccionParaPrecio } from './modulos/cotizaciones/cotizaciones.reglas.js';
import {
  crearCotizacionesService,
  type CotizacionesService,
} from './modulos/cotizaciones/cotizaciones.servicio.js';
import { crearSaludRepository } from './modulos/salud/salud.repositorio.js';
import { crearSaludService, type SaludService } from './modulos/salud/salud.servicio.js';
import {
  aConfigMensaje,
  verificarReglas,
  versionDe,
  whatsappDe,
} from './modulos/solicitudes/solicitudes.mapeo.js';
import { crearSolicitudesRepository } from './modulos/solicitudes/solicitudes.repositorio.js';
import {
  crearSolicitudesService,
  type SolicitudesService,
} from './modulos/solicitudes/solicitudes.servicio.js';

export interface Dependencias {
  salud: SaludService;
  categorias: CategoriasService;
  colores: ColoresService;
  cotizaciones: CotizacionesService;
  solicitudes: SolicitudesService;
}

export interface OpcionesDependencias {
  version: string;
  configuracion: ConfiguracionNegocio;
  whatsappNegocio: string;
}

export function crearDependencias(
  prisma: PrismaClient,
  { version, configuracion, whatsappNegocio }: OpcionesDependencias,
): Dependencias {
  const cotizaciones = crearCotizacionesService({
    repositorio: crearCotizacionesRepository(prisma),
    revisarSeleccion: (entrada) => revisarSeleccionParaPrecio(configuracion, entrada),
  });

  return {
    salud: crearSaludService(crearSaludRepository(prisma), { version }),
    categorias: crearCategoriasService(crearCategoriasRepository(prisma)),
    colores: crearColoresService(crearColoresRepository(prisma)),
    cotizaciones,
    solicitudes: crearSolicitudesService({
      repositorio: crearSolicitudesRepository(prisma),
      verificarReglas: (entrada) => verificarReglas(configuracion, entrada),
      configMensaje: aConfigMensaje(configuracion),
      numeroWhatsapp: whatsappDe(configuracion, whatsappNegocio),
      version: versionDe(configuracion),
      precio: {
        calcular: async ({ categoria, seleccion }) =>
          (await cotizaciones.cotizar({ categoria, seleccion })).precioEstimadoCrc,
      },
    }),
  };
}
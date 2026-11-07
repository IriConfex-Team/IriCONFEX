import type { PrismaClient } from '../generated/prisma/client.js';
import type { ConfiguracionNegocio } from './comun/configuracion.js';
import { crearCategoriasRepository } from './modulos/categorias/categorias.repositorio.js';
import {
  crearCategoriasService,
  type CategoriasService,
} from './modulos/categorias/categorias.servicio.js';
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
  return {
    salud: crearSaludService(crearSaludRepository(prisma), { version }),
    categorias: crearCategoriasService(crearCategoriasRepository(prisma)),
    solicitudes: crearSolicitudesService({
      repositorio: crearSolicitudesRepository(prisma),
      verificarReglas: (entrada) => verificarReglas(configuracion, entrada),
      configMensaje: aConfigMensaje(configuracion),
      numeroWhatsapp: whatsappDe(configuracion, whatsappNegocio),
      version: versionDe(configuracion),
    }),
  };
}

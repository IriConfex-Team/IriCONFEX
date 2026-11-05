import type { PrismaClient } from '../generated/prisma/client.js';
import { crearCategoriasRepository } from './modulos/categorias/categorias.repositorio.js';
import {
  crearCategoriasService,
  type CategoriasService,
} from './modulos/categorias/categorias.servicio.js';
import { crearSaludRepository } from './modulos/salud/salud.repositorio.js';
import { crearSaludService, type SaludService } from './modulos/salud/salud.servicio.js';

export interface Dependencias {
  salud: SaludService;
  categorias: CategoriasService;
}

export function crearDependencias(prisma: PrismaClient, version: string): Dependencias {
  return {
    salud: crearSaludService(crearSaludRepository(prisma), { version }),
    categorias: crearCategoriasService(crearCategoriasRepository(prisma)),
  };
}
import type { ColoresRepository } from './colores.repositorio.js';
import type { ColorItem } from './colores.esquemas.js';

export interface ColoresService {
  obtenerPorTela(codigoTela: string): Promise<ColorItem[]>;
}

export function crearColoresService(repo: ColoresRepository): ColoresService {
  return {
    obtenerPorTela: (codigoTela) => repo.listarPorTela(codigoTela),
  };
}
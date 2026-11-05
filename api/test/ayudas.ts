import type { Dependencias } from '../src/contenedor.js';
import type { Categoria } from '../src/modulos/categorias/categorias.esquemas.js';
import { crearCategoriasService } from '../src/modulos/categorias/categorias.servicio.js';
import { crearSaludService } from '../src/modulos/salud/salud.servicio.js';

export const CATEGORIAS_DE_PRUEBA: Categoria[] = [
  { codigo: 'pijamas', nombre: 'Arma tu pijama', imagenUrl: null },
  { codigo: 'camisas', nombre: 'Camisas', imagenUrl: '/img/camisas.png' },
];

interface Opciones {
  baseOk?: boolean;
  categorias?: Categoria[];
}

export function dependenciasFalsas({
  baseOk = true,
  categorias = CATEGORIAS_DE_PRUEBA,
}: Opciones = {}): Dependencias {
  return {
    salud: crearSaludService({ verificarConexion: async () => baseOk }, { version: 'test' }),
    categorias: crearCategoriasService({
      listarActivas: async () => categorias,
      buscarPorCodigo: async (codigo) => categorias.find((c) => c.codigo === codigo) ?? null,
    }),
  };
}
import { ErrorNoEncontrado } from '../../comun/errores.js';
import type { Categoria } from './categorias.esquemas.js';
import type { CategoriasRepository } from './categorias.repositorio.js';

export interface CategoriasService {
  listar(): Promise<Categoria[]>;
  obtener(codigo: string): Promise<Categoria>;
}

export function crearCategoriasService(repositorio: CategoriasRepository): CategoriasService {
  return {
    listar: () => repositorio.listarActivas(),
    async obtener(codigo) {
      const categoria = await repositorio.buscarPorCodigo(codigo);
      if (!categoria) {
        throw new ErrorNoEncontrado('La categoría «' + codigo + '»');
      }
      return categoria;
    },
  };
}
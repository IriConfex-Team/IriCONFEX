import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { Categoria } from './categorias.esquemas.js';

export interface CategoriasRepository {
  listarActivas(): Promise<Categoria[]>;
  buscarPorCodigo(codigo: string): Promise<Categoria | null>;
}

const SELECCION = { codigo: true, nombre: true, imagenUrl: true } as const;

export function crearCategoriasRepository(prisma: Pick<PrismaClient, 'categoria'>): CategoriasRepository {
  return {
    listarActivas: () =>
      prisma.categoria.findMany({
        where: { activa: true },
        orderBy: { orden: 'asc' },
        select: SELECCION,
      }),
    buscarPorCodigo: (codigo) =>
      prisma.categoria.findFirst({
        where: { codigo, activa: true },
        select: SELECCION,
      }),
  };
}
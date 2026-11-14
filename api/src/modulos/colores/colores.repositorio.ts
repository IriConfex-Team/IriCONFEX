import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { ColorItem } from './colores.esquemas.js';

export interface ColoresRepository {
  listarPorTela(codigoTela: string): Promise<ColorItem[]>;
}

const SELECCION = {
  id: true,
  clave: true,
  tipo: true,
  variante: true,
  codigoCatalogo: true,
  nombre: true,
  tonoHex: true,
  archivoOrigen: true,
  disenos: true,
  mostrarImagenes: true,
} as const;

export function crearColoresRepository(prisma: Pick<PrismaClient, 'color'>): ColoresRepository {
  return {
    listarPorTela: (codigoTela) =>
      prisma.color.findMany({
        where: {
          ofrecer: true,
          tela: { codigo: codigoTela },
        },
        orderBy: { orden: 'asc' },
        select: SELECCION,
      }),
  };
}
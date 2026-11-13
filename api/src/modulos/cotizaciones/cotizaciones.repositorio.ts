import type { PrismaClient } from '../../../generated/prisma/client.js';
import { construirCatalogo } from './cotizaciones.calculo.js';
import type { Catalogo, CotizacionesRepository } from './cotizaciones.tipos.js';

type Cliente = Pick<PrismaClient, 'opcion' | 'precioPieza' | 'recargo'>;

export interface OpcionesRepositorioCotizaciones {
  /** Cuánto tiempo se reutilizan los precios leídos (el seed los cambia muy rara vez). */
  ttlMs?: number;
  ahora?: () => number;
}

export function crearCotizacionesRepository(
  prisma: Cliente,
  { ttlMs = 60_000, ahora = () => Date.now() }: OpcionesRepositorioCotizaciones = {},
): CotizacionesRepository {
  const memoria = new Map<string, { vence: number; catalogo: Catalogo }>();

  async function leer(categoria: string): Promise<Catalogo> {
    const [opciones, precios, recargos] = await Promise.all([
      // Solo las opciones que significan algo en el catálogo (tela, pieza, talla, grupo o adicional)
      prisma.opcion.findMany({
        where: {
          paso: { categoria: { codigo: categoria } },
          OR: [
            { telaId: { not: null } },
            { tipoPiezaId: { not: null } },
            { tallaId: { not: null } },
            { grupoTallaId: { not: null } },
            { adicionalId: { not: null } },
          ],
        },
        select: {
          codigo: true,
          paso: { select: { codigo: true } },
          tela: { select: { codigo: true } },
          tipoPieza: { select: { codigo: true } },
          adicional: { select: { codigo: true } },
          talla: { select: { columna: { select: { codigo: true } } } },
          grupoTalla: { select: { tallas: { select: { columna: { select: { codigo: true } } } } } },
        },
      }),
      prisma.precioPieza.findMany({
        select: {
          montoCrc: true,
          tipoPieza: { select: { codigo: true } },
          tela: { select: { codigo: true } },
          columna: { select: { codigo: true } },
        },
      }),
      prisma.recargo.findMany({
        select: {
          montoCrc: true,
          adicional: { select: { codigo: true } },
          columna: { select: { codigo: true } },
        },
      }),
    ]);

    return construirCatalogo(
      opciones.map((o) => ({
        paso: o.paso.codigo,
        opcion: o.codigo,
        tela: o.tela?.codigo,
        pieza: o.tipoPieza?.codigo,
        adicional: o.adicional?.codigo,
        columnas: o.talla
          ? [o.talla.columna.codigo]
          : o.grupoTalla
            ? [...new Set(o.grupoTalla.tallas.map((t) => t.columna.codigo))]
            : undefined,
      })),
      precios.map((p) => ({
        pieza: p.tipoPieza.codigo,
        tela: p.tela.codigo,
        columna: p.columna.codigo,
        montoCrc: p.montoCrc,
      })),
      recargos.map((r) => ({ adicional: r.adicional.codigo, columna: r.columna.codigo, montoCrc: r.montoCrc })),
    );
  }

  return {
    async obtenerCatalogo(categoria) {
      const guardado = memoria.get(categoria);
      if (guardado && guardado.vence > ahora()) return guardado.catalogo;
      const catalogo = await leer(categoria); // si falla, no se guarda nada
      memoria.set(categoria, { vence: ahora() + ttlMs, catalogo });
      return catalogo;
    },
  };
}
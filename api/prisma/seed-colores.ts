import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaClient } from '../generated/prisma/client.js';

type ColorJson = {
  id: string;
  codigo?: string | null;
  nombre: string;
  tono?: string;
  archivo?: string;
  ofrecer?: boolean;
};

type EstampadoJson = {
  id: string;
  nombre: string;
  disenos?: number;
  mostrar_imagenes?: boolean;
  ofrecer?: boolean;
};

type TelaJson = {
  id: string;
  nombre: string;
  lisos?: ColorJson[];
  estampados?: EstampadoJson[];
  variantes?: Record<string, ColorJson[]>;
};

type DatosColor = {
  tipo: 'LISO' | 'ESTAMPADO';
  variante: string | null;
  codigoCatalogo: string | null;
  nombre: string;
  tonoHex: string | null;
  archivoOrigen: string | null;
  disenos: number | null;
  mostrarImagenes: boolean;
  ofrecer: boolean;
};

function liso(c: ColorJson, variante: string | null): DatosColor {
  return {
    tipo: 'LISO',
    variante,
    codigoCatalogo: c.codigo ?? null,
    nombre: c.nombre.trim(),
    tonoHex: c.tono ? c.tono.toUpperCase() : null,
    archivoOrigen: c.archivo ? c.archivo.trim() : null,
    disenos: null,
    mostrarImagenes: true,
    ofrecer: c.ofrecer ?? true,
  };
}

function estampado(e: EstampadoJson): DatosColor {
  return {
    tipo: 'ESTAMPADO',
    variante: null,
    codigoCatalogo: null,
    nombre: e.nombre.trim(),
    tonoHex: null,
    archivoOrigen: null,
    disenos: e.disenos ?? null,
    mostrarImagenes: e.mostrar_imagenes ?? true,
    ofrecer: e.ofrecer ?? true,
  };
}

/**
 * Carga colores_por_tela.json en la tabla color.
 * - rutaJson: ruta del archivo, relativa a la carpeta api/
 * - alias: traduce el id de la tela en el JSON al código de telas.csv (enlaces.json > alias.tela)
 */
export async function cargarColores(
  prisma: PrismaClient,
  rutaJson: string,
  alias: Record<string, string>,
): Promise<number> {
  let texto = readFileSync(resolve(process.cwd(), rutaJson), 'utf8');
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  const cfg = JSON.parse(texto) as { telas: TelaJson[] };

  const telas = new Map((await prisma.tela.findMany()).map((t) => [t.codigo, t.id] as [string, number]));
  let total = 0;

  for (const t of cfg.telas) {
    const codigoTela = alias[t.id] ?? t.id;
    const telaId = telas.get(codigoTela);
    if (telaId === undefined) {
      throw new Error('Colores: la tela "' + t.id + '" (' + codigoTela + ') no existe en telas.csv');
    }

    // 1) Armar todas las filas de la tela y detectar claves repetidas
    const filas = new Map<string, DatosColor>();
    const agregar = (clave: string, datos: DatosColor) => {
      if (filas.has(clave)) {
        throw new Error(
          'Colores: "' + clave + '" aparece dos veces en la tela ' + t.id +
            '. Renombra una de las dos en colores_por_tela.json (id y nombre).',
        );
      }
      filas.set(clave, datos);
    };
    for (const c of t.lisos ?? []) agregar(c.id, liso(c, null));
    for (const [variante, lista] of Object.entries(t.variantes ?? {})) {
      for (const c of lista) agregar(variante + ':' + c.id, liso(c, variante));
    }
    for (const e of t.estampados ?? []) agregar('estampado:' + e.id, estampado(e));

    // 2) Guardar (upsert) respetando el orden del archivo
    let orden = 0;
    for (const [clave, datos] of filas) {
      await prisma.color.upsert({
        where: { telaId_clave: { telaId, clave } },
        update: { ...datos, orden },
        create: { telaId, clave, ...datos, orden },
      });
      orden++;
      total++;
    }

    // 3) Lo que ya no viene en el archivo no se borra (puede estar en una solicitud): se desactiva
    await prisma.color.updateMany({
      where: { telaId, clave: { notIn: [...filas.keys()] } },
      data: { ofrecer: false },
    });
  }

  console.log('Colores cargados: ' + total);
  return total;
}

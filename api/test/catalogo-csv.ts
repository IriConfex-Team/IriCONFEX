import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { construirCatalogo } from '../src/modulos/cotizaciones/cotizaciones.calculo.js';
import type {
  Catalogo,
  FilaOpcion,
  FilaPrecio,
  FilaRecargo,
} from '../src/modulos/cotizaciones/cotizaciones.tipos.js';

// Lee los MISMOS archivos que carga el seed (api/prisma/data + datos/categorias), sin base de datos.
// Así las pruebas de HU-18 usan los precios reales del Anexo B.
const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const DATA = join(RAIZ, 'api/prisma/data');

const leer = (ruta: string) => readFileSync(ruta, 'utf8').replace(/^﻿/, '');

export function leerCsv(nombre: string): Record<string, string>[] {
  const lineas = leer(join(DATA, nombre))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const cols = lineas[0].split(',').map((c) => c.trim());
  return lineas.slice(1).map((l) => {
    const v = l.split(',').map((x) => x.trim());
    return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? '']));
  });
}

export const COLUMNAS = ['bebe', 'nino_2_10', 'nino_12', 'adulto', 'plus'] as const;
export type Columna = (typeof COLUMNAS)[number];

export const filasPrecio: FilaPrecio[] = leerCsv('precios.csv').flatMap((r) =>
  COLUMNAS.map((columna) => ({
    pieza: r.pieza,
    tela: r.tela,
    columna,
    montoCrc: r[columna] === '' || r[columna] === undefined ? null : Number(r[columna]),
  })),
);

export const filasRecargo: FilaRecargo[] = leerCsv('recargos.csv').map((r) => ({
  adicional: r.adicional,
  columna: r.columna,
  montoCrc: Number(r.monto),
}));

/** Monto de la tabla del Anexo B, leído directo del CSV (independiente del cálculo). */
export const montoPieza = (pieza: string, tela: string, columna: string): number =>
  filasPrecio.find((f) => f.pieza === pieza && f.tela === tela && f.columna === columna)!.montoCrc!;
export const montoRecargo = (adicional: string, columna: string): number =>
  filasRecargo.find((f) => f.adicional === adicional && f.columna === columna)!.montoCrc!;

// «adulto-s» → «adulto:S», «nino-12» → «nino:12», «bebe-0-3» → «bebe:0-3» (igual que el seed)
function claveTalla(id: string): string {
  const i = id.indexOf('-');
  return id.slice(0, i) + ':' + id.slice(i + 1).toUpperCase();
}

const enlaces = JSON.parse(leer(join(DATA, 'enlaces.json')));
const pijamas = JSON.parse(leer(join(RAIZ, 'datos/categorias/pijamas.json')));
const tallas = leerCsv('tallas.csv');

/** Opción del configurador (id del JSON) a partir del código de tela del catálogo (satin_alicrado → satin-alicrado). */
export const opcionDeTela = (codigoTela: string): string =>
  Object.entries<string>(enlaces.alias.tela).find(([, cat]) => cat === codigoTela)?.[0] ?? codigoTela;

function filasOpcion(): FilaOpcion[] {
  const filas: FilaOpcion[] = [];
  for (const paso of pijamas.pasos) {
    const tipo: string | undefined = enlaces.pasos[paso.id];
    for (const o of paso.opciones) {
      const alias = (t: string) => enlaces.alias?.[t]?.[o.id] ?? o.id;
      const fila: FilaOpcion = { paso: paso.id, opcion: o.id };
      if (tipo === 'tela') fila.tela = alias('tela');
      if (tipo === 'tipoPieza') fila.pieza = alias('tipoPieza');
      if (tipo === 'talla') {
        const t = tallas.find((x) => x.grupo + ':' + x.talla === claveTalla(o.id))!;
        fila.columnas = [t.columna];
      }
      if (tipo === 'grupoTalla') {
        fila.columnas = [...new Set(tallas.filter((x) => x.grupo === o.id).map((x) => x.columna))];
      }
      const adicional = enlaces.adicionales?.[paso.id + ':' + o.id];
      if (adicional) fila.adicional = adicional;
      if (fila.tela || fila.pieza || fila.columnas || fila.adicional) filas.push(fila);
    }
  }
  return filas;
}

export const filasDeOpcion = filasOpcion();

export function catalogoDePrueba(): Catalogo {
  return construirCatalogo(filasDeOpcion, filasPrecio, filasRecargo);
}
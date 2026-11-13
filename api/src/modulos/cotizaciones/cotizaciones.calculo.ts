import type {
  Catalogo,
  Cotizacion,
  FilaOpcion,
  FilaPrecio,
  FilaRecargo,
  LineaPrecio,
} from './cotizaciones.tipos.js';

// Ids de pasos y opciones de pijamas.json que el cálculo necesita conocer.
// AJUSTA aquí si cambian en datos/categorias/pijamas.json.
export const PASOS_PRECIO = {
  base: 'base',
  unaPieza: 'una-pieza',
  tipoInferior: 'tipo-inferior',
  telaSuperior: 'tela-superior',
  telaInferior: 'tela-inferior',
  tallaSuperior: 'talla-superior',
  tallaInferior: 'talla-inferior',
  grupoTalla: 'grupo-talla',
  modalidadTalla: 'modalidad-talla',
  valorUniversal: 'universal',
  /** Pasos cuya opción puede sumar un adicional (cuello camisero, bata de salida) */
  conAdicional: ['escote', 'bata-salida'],
} as const;

export const llaveOpcion = (paso: string, opcion: string) => paso + ':' + opcion;
export const llavePrecio = (pieza: string, tela: string, columna: string) =>
  pieza + '|' + tela + '|' + columna;
export const llaveRecargo = (adicional: string, columna: string) => adicional + '|' + columna;

/** Arma el catálogo en memoria a partir de filas planas. Sin base de datos: se puede probar solo. */
export function construirCatalogo(
  opciones: FilaOpcion[],
  precios: FilaPrecio[],
  recargos: FilaRecargo[],
): Catalogo {
  return {
    enlaces: new Map(
      opciones.map((o) => [
        llaveOpcion(o.paso, o.opcion),
        {
          tela: o.tela ?? undefined,
          pieza: o.pieza ?? undefined,
          adicional: o.adicional ?? undefined,
          columnas: o.columnas,
        },
      ]),
    ),
    precios: new Map(precios.map((p) => [llavePrecio(p.pieza, p.tela, p.columna), p.montoCrc])),
    recargos: new Map(recargos.map((r) => [llaveRecargo(r.adicional, r.columna), r.montoCrc])),
  };
}

const INCOMPLETO: Cotizacion = { estado: 'incompleto', precioEstimadoCrc: null, moneda: 'CRC', lineas: [] };

type Columna = { tipo: 'ok'; codigo: string } | { tipo: 'sin-columna' } | { tipo: 'incompleto' };

const enlaceDe = (c: Catalogo, seleccion: Record<string, string>, paso: string) => {
  const valor = seleccion[paso];
  return valor === undefined ? undefined : c.enlaces.get(llaveOpcion(paso, valor));
};

/**
 * Columna de precio de una pieza:
 *  1. Si eligió talla, la columna de esa talla (nino-10 → nino_2_10, nino-12 → nino_12).
 *  2. Si no, y todas las tallas de su grupo comparten columna (adulto, plus, bebé), esa.
 *  3. Si no se puede saber y el cliente ya dijo «medidas» o «presencial» → «sin-columna» (a confirmar).
 *  4. Si todavía está eligiendo la talla → «incompleto».
 */
function columnaDe(c: Catalogo, seleccion: Record<string, string>, pasoTalla: string): Columna {
  const talla = enlaceDe(c, seleccion, pasoTalla)?.columnas;
  if (talla?.length === 1) return { tipo: 'ok', codigo: talla[0] };

  const grupo = enlaceDe(c, seleccion, PASOS_PRECIO.grupoTalla)?.columnas;
  if (grupo?.length === 1) return { tipo: 'ok', codigo: grupo[0] };

  const modalidad = seleccion[PASOS_PRECIO.modalidadTalla];
  if (grupo && modalidad !== undefined && modalidad !== PASOS_PRECIO.valorUniversal) {
    return { tipo: 'sin-columna' };
  }
  return { tipo: 'incompleto' };
}

/** Anexo B: suma de piezas + adicionales. Si falta cualquier precio, no hay total («a confirmar»). */
export function calcularPrecio(catalogo: Catalogo, seleccion: Record<string, string>): Cotizacion {
  const base = enlaceDe(catalogo, seleccion, PASOS_PRECIO.base);
  if (!base?.pieza) return INCOMPLETO;

  const partes: { pieza: string; pasoTela: string; pasoTalla: string }[] = [
    { pieza: base.pieza, pasoTela: PASOS_PRECIO.telaSuperior, pasoTalla: PASOS_PRECIO.tallaSuperior },
  ];
  if (seleccion[PASOS_PRECIO.base] !== PASOS_PRECIO.unaPieza) {
    const inferior = enlaceDe(catalogo, seleccion, PASOS_PRECIO.tipoInferior);
    if (!inferior?.pieza) return INCOMPLETO;
    partes.push({
      pieza: inferior.pieza,
      pasoTela: PASOS_PRECIO.telaInferior,
      pasoTalla: PASOS_PRECIO.tallaInferior,
    });
  }

  const lineas: LineaPrecio[] = [];
  let columnaSuperior: Columna = { tipo: 'incompleto' };

  for (const [i, parte] of partes.entries()) {
    const tela = enlaceDe(catalogo, seleccion, parte.pasoTela)?.tela;
    if (!tela) return INCOMPLETO;
    const columna = columnaDe(catalogo, seleccion, parte.pasoTalla);
    if (columna.tipo === 'incompleto') return INCOMPLETO;
    if (i === 0) columnaSuperior = columna;
    lineas.push({
      tipo: 'pieza',
      codigo: parte.pieza,
      montoCrc:
        columna.tipo === 'ok'
          ? (catalogo.precios.get(llavePrecio(parte.pieza, tela, columna.codigo)) ?? null)
          : null,
    });
  }

  // Adicionales: el recargo depende de la columna de la parte de arriba (o de la bata)
  for (const paso of PASOS_PRECIO.conAdicional) {
    const adicional = enlaceDe(catalogo, seleccion, paso)?.adicional;
    if (!adicional) continue;
    lineas.push({
      tipo: 'adicional',
      codigo: adicional,
      montoCrc:
        columnaSuperior.tipo === 'ok'
          ? (catalogo.recargos.get(llaveRecargo(adicional, columnaSuperior.codigo)) ?? null)
          : null,
    });
  }

  const completo = lineas.every((l) => l.montoCrc !== null);
  return {
    estado: completo ? 'estimado' : 'a_confirmar',
    precioEstimadoCrc: completo ? lineas.reduce((suma, l) => suma + (l.montoCrc ?? 0), 0) : null,
    moneda: 'CRC',
    lineas,
  };
}
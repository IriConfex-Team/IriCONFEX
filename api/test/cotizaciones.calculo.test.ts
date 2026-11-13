import { describe, expect, it } from 'vitest';
import { calcularPrecio, construirCatalogo } from '../src/modulos/cotizaciones/cotizaciones.calculo.js';
import {
  catalogoDePrueba,
  COLUMNAS,
  filasDeOpcion,
  filasPrecio,
  filasRecargo,
  leerCsv,
  montoPieza,
  montoRecargo,
  opcionDeTela,
  type Columna,
} from './catalogo-csv.js';

const catalogo = catalogoDePrueba();

// Una talla cualquiera de cada columna de precio
const TALLA: Record<Columna, string> = {
  bebe: 'bebe-0-3',
  nino_2_10: 'nino-2',
  nino_12: 'nino-12',
  adulto: 'adulto-m',
  plus: 'plus-2xl',
};
const TIPO_INFERIOR: Record<string, string> = { pantalon_largo: 'pantalon-largo', capri: 'capri', short: 'short' };

/** Selección de dos piezas: blusa + parte de abajo, cada una con su tela, ambas en la misma columna. */
function dosPiezas(inferior: string, telaSup: string, telaInf: string, columna: Columna) {
  return {
    base: 'dos-piezas',
    'tipo-inferior': TIPO_INFERIOR[inferior],
    'tela-superior': opcionDeTela(telaSup),
    'tela-inferior': opcionDeTela(telaInf),
    'talla-superior': TALLA[columna],
    'talla-inferior': TALLA[columna],
  };
}

const combinaciones = leerCsv('precios.csv').flatMap((fila) =>
  COLUMNAS.map((columna) => ({ pieza: fila.pieza, tela: fila.tela, columna })),
);

describe('HU-18 · una prueba por combinación del Anexo B', () => {
  it('el Anexo B tiene 30 filas × 5 columnas = 150 combinaciones', () => {
    expect(combinaciones).toHaveLength(150);
  });

  it.each(combinaciones)('$pieza · $tela · $columna', ({ pieza, tela, columna }) => {
    let seleccion: Record<string, string>;
    let esperado: number;

    if (pieza === 'bata') {
      seleccion = { base: 'una-pieza', 'tela-superior': opcionDeTela(tela), 'talla-superior': TALLA[columna] };
      esperado = montoPieza('bata', tela, columna);
    } else if (pieza === 'blusa_camisa') {
      // La blusa se prueba junto a un pantalón largo de brush (parte de abajo fija)
      seleccion = dosPiezas('pantalon_largo', tela, 'brush', columna);
      esperado = montoPieza('blusa_camisa', tela, columna) + montoPieza('pantalon_largo', 'brush', columna);
    } else {
      // Cada parte de abajo se prueba junto a una blusa de brush (parte de arriba fija)
      seleccion = dosPiezas(pieza, 'brush', tela, columna);
      esperado = montoPieza('blusa_camisa', 'brush', columna) + montoPieza(pieza, tela, columna);
    }

    const resultado = calcularPrecio(catalogo, seleccion);
    expect(resultado.estado).toBe('estimado');
    expect(resultado.precioEstimadoCrc).toBe(esperado);
    expect(resultado.moneda).toBe('CRC');
  });
});

describe('HU-18 · adicionales (recargos)', () => {
  it.each(leerCsv('recargos.csv').filter((r) => r.adicional === 'cuello_camisero'))(
    'cuello camisero en $columna suma ₡$monto',
    ({ columna, monto }) => {
      const base = dosPiezas('pantalon_largo', 'satin', 'satin', columna as Columna);
      const sin = calcularPrecio(catalogo, base);
      const con = calcularPrecio(catalogo, { ...base, escote: 'camisero' });
      expect(con.estado).toBe('estimado');
      expect(con.precioEstimadoCrc).toBe(sin.precioEstimadoCrc! + Number(monto));
      expect(con.lineas[con.lineas.length - 1]).toEqual({ tipo: 'adicional', codigo: 'cuello_camisero', montoCrc: Number(monto) });
    },
  );

  it.each(['adulto', 'plus'] as const)('bata de salida en %s suma su recargo', (columna) => {
    const bata = { base: 'una-pieza', 'tela-superior': 'satin', 'talla-superior': TALLA[columna] };
    const sin = calcularPrecio(catalogo, { ...bata, 'bata-salida': 'no' });
    const con = calcularPrecio(catalogo, { ...bata, 'bata-salida': 'si' });
    expect(con.precioEstimadoCrc).toBe(sin.precioEstimadoCrc! + montoRecargo('bata_salida', columna));
    expect(sin.lineas.some((l) => l.tipo === 'adicional')).toBe(false);
  });

  it('un escote sin recargo (redondo) no suma nada', () => {
    const base = dosPiezas('short', 'brush', 'brush', 'adulto');
    expect(calcularPrecio(catalogo, { ...base, escote: 'redondo' })).toEqual(calcularPrecio(catalogo, base));
  });
});

describe('HU-18 · cómo se decide la columna de precio', () => {
  it('nino-10 usa la columna «Niño 2-10» y nino-12 la columna «Niño 12»', () => {
    const base = { base: 'una-pieza', 'tela-superior': 'brush' };
    expect(calcularPrecio(catalogo, { ...base, 'talla-superior': 'nino-10' }).precioEstimadoCrc).toBe(
      montoPieza('bata', 'brush', 'nino_2_10'),
    );
    expect(calcularPrecio(catalogo, { ...base, 'talla-superior': 'nino-12' }).precioEstimadoCrc).toBe(
      montoPieza('bata', 'brush', 'nino_12'),
    );
  });

  it('con «Mis medidas» o «Medición presencial» de adulto, basta el grupo de talla', () => {
    for (const modalidad of ['medida', 'presencial']) {
      const r = calcularPrecio(catalogo, {
        base: 'una-pieza',
        'tela-superior': 'modal',
        'modalidad-talla': modalidad,
        'grupo-talla': 'plus',
      });
      expect(r.precioEstimadoCrc).toBe(montoPieza('bata', 'modal', 'plus'));
    }
  });

  it('con tallas distintas arriba y abajo usa la columna de cada una', () => {
    const r = calcularPrecio(catalogo, {
      ...dosPiezas('short', 'brush', 'brush', 'nino_2_10'),
      'talla-inferior': 'nino-12',
    });
    expect(r.precioEstimadoCrc).toBe(montoPieza('blusa_camisa', 'brush', 'nino_2_10') + montoPieza('short', 'brush', 'nino_12'));
  });
});

describe('HU-18 · «a confirmar» cuando falta un precio', () => {
  const sinPrecio = (pieza: string, tela: string, columna: string) =>
    construirCatalogo(
      filasDeOpcion,
      filasPrecio.map((f) => (f.pieza === pieza && f.tela === tela && f.columna === columna ? { ...f, montoCrc: null } : f)),
      filasRecargo,
    );

  it('si una pieza no tiene precio en la tabla, no hay total y se marca «a_confirmar»', () => {
    const cat = sinPrecio('short', 'brush', 'adulto');
    const r = calcularPrecio(cat, dosPiezas('short', 'brush', 'brush', 'adulto'));
    expect(r.estado).toBe('a_confirmar');
    expect(r.precioEstimadoCrc).toBeNull();
    expect(r.lineas.find((l) => l.codigo === 'short')?.montoCrc).toBeNull();
    expect(r.lineas.find((l) => l.codigo === 'blusa_camisa')?.montoCrc).toBe(montoPieza('blusa_camisa', 'brush', 'adulto'));
  });

  it('si la fila ni siquiera existe en la tabla, también es «a_confirmar»', () => {
    const cat = construirCatalogo(filasDeOpcion, [], filasRecargo);
    const r = calcularPrecio(cat, dosPiezas('short', 'brush', 'brush', 'adulto'));
    expect(r.estado).toBe('a_confirmar');
    expect(r.precioEstimadoCrc).toBeNull();
  });

  it('si falta el recargo de un adicional, es «a_confirmar»', () => {
    const cat = construirCatalogo(filasDeOpcion, filasPrecio, []);
    const r = calcularPrecio(cat, { ...dosPiezas('short', 'satin', 'satin', 'adulto'), escote: 'camisero' });
    expect(r.estado).toBe('a_confirmar');
    expect(r.precioEstimadoCrc).toBeNull();
  });

  it('niño con medición presencial: no se sabe la columna (2-10 o 12), queda «a_confirmar»', () => {
    const r = calcularPrecio(catalogo, {
      base: 'dos-piezas',
      'tipo-inferior': 'short',
      'tela-superior': 'brush',
      'tela-inferior': 'brush',
      'modalidad-talla': 'presencial',
      'grupo-talla': 'nino',
    });
    expect(r.estado).toBe('a_confirmar');
    expect(r.precioEstimadoCrc).toBeNull();
  });
});

describe('HU-18 · «incompleto» mientras el cliente aún elige', () => {
  it.each([
    ['sin nada elegido', {}],
    ['solo la base', { base: 'dos-piezas' }],
    ['dos piezas sin parte de abajo', { base: 'dos-piezas', 'tela-superior': 'brush', 'talla-superior': 'adulto-m' }],
    ['sin tela de arriba', { base: 'una-pieza', 'talla-superior': 'adulto-m' }],
    ['una pieza sin talla ni grupo', { base: 'una-pieza', 'tela-superior': 'brush' }],
    [
      'talla estándar de niño sin elegir la talla (el grupo no basta)',
      { base: 'una-pieza', 'tela-superior': 'brush', 'modalidad-talla': 'universal', 'grupo-talla': 'nino' },
    ],
    [
      'falta la talla de abajo',
      { ...dosPiezas('short', 'brush', 'brush', 'nino_2_10'), 'talla-inferior': undefined as unknown as string },
    ],
  ])('%s', (_nombre, seleccion) => {
    const limpia = Object.fromEntries(Object.entries(seleccion).filter(([, v]) => v !== undefined)) as Record<string, string>;
    const r = calcularPrecio(catalogo, limpia);
    expect(r.estado).toBe('incompleto');
    expect(r.precioEstimadoCrc).toBeNull();
  });
});
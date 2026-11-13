import { describe, expect, it, vi } from 'vitest';
import { calcularPrecio } from '../src/modulos/cotizaciones/cotizaciones.calculo.js';
import { crearCotizacionesRepository } from '../src/modulos/cotizaciones/cotizaciones.repositorio.js';

// Respuestas con la misma forma que devuelve Prisma con los `select` del repositorio
function clienteFalso() {
  return {
    opcion: {
      findMany: vi.fn(async () => [
        { codigo: 'una-pieza', paso: { codigo: 'base' }, tipoPieza: { codigo: 'bata' }, tela: null, adicional: null, talla: null, grupoTalla: null },
        { codigo: 'rib', paso: { codigo: 'tela-superior' }, tipoPieza: null, tela: { codigo: 'rib_acanalado' }, adicional: null, talla: null, grupoTalla: null },
        { codigo: 'adulto-m', paso: { codigo: 'talla-superior' }, tipoPieza: null, tela: null, adicional: null, talla: { columna: { codigo: 'adulto' } }, grupoTalla: null },
        {
          codigo: 'nino',
          paso: { codigo: 'grupo-talla' },
          tipoPieza: null,
          tela: null,
          adicional: null,
          talla: null,
          grupoTalla: { tallas: [{ columna: { codigo: 'nino_2_10' } }, { columna: { codigo: 'nino_2_10' } }, { columna: { codigo: 'nino_12' } }] },
        },
      ]),
    },
    precioPieza: {
      findMany: vi.fn(async () => [
        { montoCrc: 9500, tipoPieza: { codigo: 'bata' }, tela: { codigo: 'rib_acanalado' }, columna: { codigo: 'adulto' } },
      ]),
    },
    recargo: { findMany: vi.fn(async () => []) },
  };
}

describe('crearCotizacionesRepository', () => {
  it('convierte las filas de la base en un catálogo que el cálculo entiende', async () => {
    const repo = crearCotizacionesRepository(clienteFalso() as never);
    const catalogo = await repo.obtenerCatalogo('pijamas');

    expect(catalogo.enlaces.get('tela-superior:rib')?.tela).toBe('rib_acanalado');
    expect(catalogo.enlaces.get('grupo-talla:nino')?.columnas).toEqual(['nino_2_10', 'nino_12']);
    expect(
      calcularPrecio(catalogo, { base: 'una-pieza', 'tela-superior': 'rib', 'talla-superior': 'adulto-m' }).precioEstimadoCrc,
    ).toBe(9500);
  });

  it('reutiliza los precios durante el TTL y vuelve a leer después', async () => {
    const cliente = clienteFalso();
    let ahora = 1_000;
    const repo = crearCotizacionesRepository(cliente as never, { ttlMs: 60_000, ahora: () => ahora });

    await repo.obtenerCatalogo('pijamas');
    await repo.obtenerCatalogo('pijamas');
    expect(cliente.precioPieza.findMany).toHaveBeenCalledTimes(1);

    ahora += 61_000;
    await repo.obtenerCatalogo('pijamas');
    expect(cliente.precioPieza.findMany).toHaveBeenCalledTimes(2);
  });

  it('si la lectura falla no guarda nada y el siguiente intento vuelve a leer', async () => {
    const cliente = clienteFalso();
    cliente.precioPieza.findMany.mockRejectedValueOnce(new Error('base caída'));
    const repo = crearCotizacionesRepository(cliente as never);

    await expect(repo.obtenerCatalogo('pijamas')).rejects.toThrow('base caída');
    await expect(repo.obtenerCatalogo('pijamas')).resolves.toBeDefined();
  });
});
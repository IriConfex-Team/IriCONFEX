import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cargarConfiguracion, elegir, evaluarFlujo, iniciarSeleccion } from '@iriconfex/shared';
import { describe, expect, it } from 'vitest';
import { calcularPrecio } from '../src/modulos/cotizaciones/cotizaciones.calculo.js';
import { revisarSeleccionParaPrecio } from '../src/modulos/cotizaciones/cotizaciones.reglas.js';
import { catalogoDePrueba } from './catalogo-csv.js';

// Usa el motor y el pijamas.json REALES: recorre el flujo como lo haría el cliente, paso a paso.
const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const configuracion = cargarConfiguracion(
  JSON.parse(readFileSync(join(RAIZ, 'datos/categorias/pijamas.json'), 'utf8').replace(/^﻿/, '')),
);
const catalogo = catalogoDePrueba();
const problemas = (seleccion: Record<string, string>) =>
  revisarSeleccionParaPrecio(configuracion, { categoria: 'pijamas', seleccion });

/** Elige, en cada paso pendiente, la primera o la última opción que ofrece el motor. */
function recorrer(perfil: string, cual: 'primera' | 'ultima') {
  let seleccion = elegir(configuracion, iniciarSeleccion(configuracion), 'perfil', perfil).seleccion;
  const prefijos = [seleccion];
  for (let i = 0; i < 80; i++) {
    const pendiente = evaluarFlujo(configuracion, seleccion).pasos.find((p) => p.valor === undefined);
    if (!pendiente) break;
    const opcion = cual === 'primera' ? pendiente.opciones[0] : pendiente.opciones[pendiente.opciones.length - 1];
    seleccion = elegir(configuracion, seleccion, pendiente.paso.id, opcion.id).seleccion;
    prefijos.push(seleccion);
  }
  return { seleccion, prefijos };
}

describe('HU-18 · la revisión de reglas con el flujo real', () => {
  for (const perfil of ['mujer', 'hombre', 'nino', 'bebe']) {
    for (const cual of ['primera', 'ultima'] as const) {
      it(`${perfil} (${cual} opción de cada paso): ningún paso intermedio da error y al final hay cotización`, () => {
        const { seleccion, prefijos } = recorrer(perfil, cual);

        // Mientras configura, lo que falta por elegir no es un error (si lo fuera, la barra daría 400)
        for (const parcial of prefijos) expect(problemas(parcial)).toEqual([]);

        const final = calcularPrecio(catalogo, seleccion);
        expect(['estimado', 'a_confirmar']).toContain(final.estado);
        if (final.estado === 'estimado') expect(final.precioEstimadoCrc).toBeGreaterThan(0);
      });
    }
  }

  it('mientras faltan elecciones el precio es «incompleto»', () => {
    const { prefijos } = recorrer('mujer', 'primera');
    expect(calcularPrecio(catalogo, prefijos[0]).estado).toBe('incompleto');
    expect(calcularPrecio(catalogo, prefijos[1]).estado).toBe('incompleto');
  });

  it('un conflicto real SÍ es error: cuello camisero con tela brush', () => {
    const errores = problemas({ perfil: 'mujer', base: 'dos-piezas', escote: 'camisero', 'tela-superior': 'brush' });
    expect(errores.some((e) => e.campo === 'escote')).toBe(true);
  });

  it('una selección completa se revalida con todas las reglas (sin falsos errores en las válidas)', () => {
    for (const perfil of ['mujer', 'hombre', 'nino', 'bebe']) {
      const { seleccion } = recorrer(perfil, 'primera');
      expect(evaluarFlujo(configuracion, seleccion).completo).toBe(true);
      expect(problemas(seleccion)).toEqual([]);
    }
  });

  it('una opción que viola una regla sí es error (escote en V no existe para bebé)', () => {
    const { seleccion } = recorrer('bebe', 'primera');
    const errores = problemas({ ...seleccion, escote: 'v' });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores.some((e) => e.campo === 'escote')).toBe(true);
  });

  it('un paso que no existe es error', () => {
    expect(problemas({ perfil: 'mujer', paso_inventado: 'x' }).some((e) => e.campo === 'paso_inventado')).toBe(true);
  });

  it('una categoría distinta de pijamas es error', () => {
    expect(revisarSeleccionParaPrecio(configuracion, { categoria: 'camisas', seleccion: {} })[0].campo).toBe('categoria');
  });
});
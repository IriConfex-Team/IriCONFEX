import { describe, expect, it } from 'vitest';
import { cargarConfigPijamas } from '../src/comun/configuracion.js';
import { aConfigMensaje, verificarReglas } from '../src/modulos/solicitudes/solicitudes.mapeo.js';
import { armarMensaje } from '../src/modulos/solicitudes/solicitudes.mensaje.js';
import type { SolicitudEntrada } from '../src/modulos/solicitudes/solicitudes.tipos.js';

// HU-12a con el pijamas.json real: el servidor revalida el color de cada tela y lo pone en el mensaje.
const configuracion = cargarConfigPijamas('../datos/categorias/pijamas.json');

const entrada: SolicitudEntrada = {
  categoria: 'pijamas',
  nombre: 'Ana Mora',
  telefono: '88887777',
  seleccion: {
    perfil: 'hombre',
    base: 'dos-piezas',
    escote: 'redondo',
    manga: 'corta',
    'acabado-superior': 'simple',
    'tipo-inferior': 'short',
    'acabado-inferior': 'simple',
    'tela-superior': 'brush',
    'tela-inferior': 'satin',
    'modalidad-talla': 'universal',
    'grupo-talla': 'adulto',
    'talla-superior': 'adulto-m',
    'talla-inferior': 'adulto-m',
    entrega: 'retiro',
  },
  colores: { 'tela-superior': { catalogo: 'c1-rosado-claro' }, 'tela-inferior': { otro: 'vino' } },
  consentimientoEn: new Date('2026-11-14T18:00:00.000Z'),
};

describe('HU-12a · colores en la solicitud', () => {
  it('una selección con un color válido por tela pasa la revalidación', async () => {
    expect(await verificarReglas(configuracion, entrada)).toEqual([]);
  });

  it('rechaza un color que no es de esa tela o que falta', async () => {
    const otraTela = { ...entrada, colores: { ...entrada.colores, 'tela-inferior': { catalogo: 'c1-rosado-claro' } } };
    expect(await verificarReglas(configuracion, otraTela)).toEqual(['«Color de la parte de abajo» no es válido para esa tela.']);
    expect(await verificarReglas(configuracion, { ...entrada, colores: undefined })).toEqual([
      'Falta elegir «Color de la parte de arriba».',
      'Falta elegir «Color de la parte de abajo».',
    ]);
  });

  it('el mensaje de WhatsApp lleva el color debajo de cada tela', () => {
    const mensaje = armarMensaje(aConfigMensaje(configuracion), { referencia: 'IRI-PRUEBA01', entrada, precioEstimadoCrc: 12000 });
    expect(mensaje).toContain(
      'Tela de la parte de arriba: Brush\nColor de la parte de arriba: Rosado Claro (C1)\n' +
        'Tela de la parte de abajo: Satín\nColor de la parte de abajo: Otro color: vino',
    );
  });
});

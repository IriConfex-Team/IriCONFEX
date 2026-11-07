import { describe, expect, it } from 'vitest';
import { generarReferencia } from '../src/comun/referencia.js';
import {
  formatearTelefono,
  normalizarNumeroWhatsapp,
  urlWhatsapp,
} from '../src/comun/whatsapp.js';
import { armarMensaje } from '../src/modulos/solicitudes/solicitudes.mensaje.js';
import { aCodigoDeMedida } from '../src/modulos/solicitudes/solicitudes.repositorio.js';
import { CONFIG_MENSAJE_DE_PRUEBA } from './ayudas.js';

describe('generarReferencia', () => {
  it('usa solo caracteres sin ambigüedad y es distinta cada vez', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const ref = generarReferencia();
      expect(ref).toMatch(/^[A-Z]{2,4}-[A-HJ-NP-Z2-9]{8}$/);
      vistas.add(ref);
    }
    expect(vistas.size).toBe(2000);
  });
});

describe('whatsapp', () => {
  it('agrega el código de país a un número de 8 dígitos', () => {
    expect(normalizarNumeroWhatsapp('8341-3594')).toBe('50683413594');
  });
  it('formatea el teléfono para mostrarlo', () => {
    expect(formatearTelefono('88887777')).toBe('8888-7777');
  });
  it('codifica saltos de línea y asteriscos en el enlace', () => {
    const url = urlWhatsapp('83413594', '*Hola*\nmundo');
    expect(url).toBe('https://wa.me/50683413594?text=%2AHola%2A%0Amundo');
  });
});

describe('medidas', () => {
  it('convierte los ids con guion a los del catálogo con guion bajo', () => {
    expect(aCodigoDeMedida('ancho-espalda')).toBe('ancho_espalda');
    expect(aCodigoDeMedida('largo-pantalon')).toBe('largo_pantalon');
  });
});

describe('armarMensaje', () => {
  const entrada = {
    categoria: 'pijamas',
    nombre: 'Ana Mora',
    telefono: '88887777',
    seleccion: { perfil: 'bebe', escote: 'redondo', 'modalidad-talla': 'medida', entrega: 'retiro' },
    medidas: { 'ancho-espalda': 38.5 },
    consentimientoEn: new Date(),
  };

  it('agrupa por las secciones del resumen y pone las medidas dentro de Tallaje', () => {
    const texto = armarMensaje(CONFIG_MENSAJE_DE_PRUEBA, {
      referencia: 'IC-AAAAAAAA',
      entrada,
      precioEstimadoCrc: null,
    });
    const tallaje = texto.indexOf('*Tallaje*');
    const medidas = texto.indexOf('Medidas (cm):');
    const entrega = texto.indexOf('*Entrega*');
    expect(tallaje).toBeGreaterThan(-1);
    expect(medidas).toBeGreaterThan(tallaje);
    expect(entrega).toBeGreaterThan(medidas);
    expect(texto).toContain('- Ancho de espalda: 38,5');
    expect(texto).toContain('Cómo recibes tu pijama: Retiro en el local');
    expect(texto).toContain('Precio estimado: a confirmar');
  });

  it('omite las secciones sin respuestas', () => {
    const { escote: _omitido, ...sinEscote } = entrada.seleccion;
    const texto = armarMensaje(CONFIG_MENSAJE_DE_PRUEBA, {
      referencia: 'IC-AAAAAAAA',
      entrada: { ...entrada, seleccion: sinEscote, medidas: undefined },
      precioEstimadoCrc: null,
    });
    expect(texto).not.toContain('*Parte superior*');
    expect(texto).not.toContain('Medidas (cm):');
  });

  it('formatea el precio con la palabra «estimado»', () => {
    const texto = armarMensaje(CONFIG_MENSAJE_DE_PRUEBA, {
      referencia: 'IC-AAAAAAAA',
      entrada,
      precioEstimadoCrc: 10500,
    });
    expect(texto).toContain('₡10 500 (estimado');
    expect(texto.toLowerCase()).not.toContain('pedido');
  });
});

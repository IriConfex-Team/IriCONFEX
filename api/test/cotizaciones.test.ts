import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { dependenciasFalsas } from './ayudas.js';
import { montoPieza, montoRecargo } from './catalogo-csv.js';

// Mujer adulta, 2 piezas: blusa de brush + short de satín, talla M
const seleccion = {
  base: 'dos-piezas',
  'tipo-inferior': 'short',
  'tela-superior': 'brush',
  'tela-inferior': 'satin',
  'talla-superior': 'adulto-m',
  'talla-inferior': 'adulto-m',
};
const cuerpo = { categoria: 'pijamas', seleccion };

describe('POST /api/quotes', () => {
  it('responde 200 con el precio estimado calculado en el servidor', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app).post('/api/quotes').send(cuerpo);

    const esperado = montoPieza('blusa_camisa', 'brush', 'adulto') + montoPieza('short', 'satin', 'adulto');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      estado: 'estimado',
      precioEstimadoCrc: esperado,
      moneda: 'CRC',
      lineas: [
        { tipo: 'pieza', codigo: 'blusa_camisa', montoCrc: montoPieza('blusa_camisa', 'brush', 'adulto') },
        { tipo: 'pieza', codigo: 'short', montoCrc: montoPieza('short', 'satin', 'adulto') },
      ],
    });
  });

  it('suma el recargo del cuello camisero', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app)
      .post('/api/quotes')
      .send({ ...cuerpo, seleccion: { ...seleccion, 'tela-superior': 'satin', escote: 'camisero' } });

    const esperado =
      montoPieza('blusa_camisa', 'satin', 'adulto') + montoPieza('short', 'satin', 'adulto') + montoRecargo('cuello_camisero', 'adulto');
    expect(r.body.precioEstimadoCrc).toBe(esperado);
  });

  it('el cliente no puede mandar precios: el campo se rechaza (el esquema es estricto)', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app).post('/api/quotes').send({ ...cuerpo, precioEstimadoCrc: 1 });
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe('VALIDACION');
  });

  it('con la selección a medias responde 200 «incompleto», sin precio', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app).post('/api/quotes').send({ categoria: 'pijamas', seleccion: { perfil: 'mujer' } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ estado: 'incompleto', precioEstimadoCrc: null, lineas: [] });
  });

  it('niño con medición presencial responde «a_confirmar» con precio null', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app)
      .post('/api/quotes')
      .send({
        categoria: 'pijamas',
        seleccion: {
          ...seleccion,
          'talla-superior': undefined,
          'talla-inferior': undefined,
          'modalidad-talla': 'presencial',
          'grupo-talla': 'nino',
        },
      });
    expect(r.status).toBe(200);
    expect(r.body.estado).toBe('a_confirmar');
    expect(r.body.precioEstimadoCrc).toBeNull();
  });

  it('responde 400 VALIDACION si falta la selección', async () => {
    const app = crearApp(dependenciasFalsas());
    const r = await request(app).post('/api/quotes').send({ categoria: 'pijamas' });
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 400 SELECCION_INVALIDA si la selección viola las reglas', async () => {
    const app = crearApp(
      dependenciasFalsas({ problemasCotizacion: [{ campo: 'escote', mensaje: 'El escote no está disponible' }] }),
    );
    const r = await request(app).post('/api/quotes').send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe('SELECCION_INVALIDA');
    expect(r.body.error.detalles[0]).toEqual({ campo: 'escote', mensaje: 'El escote no está disponible' });
  });

  it('responde 429 cuando se pasa del límite de consultas', async () => {
    const app = crearApp(dependenciasFalsas(), { limiteCotizaciones: 2 });
    await request(app).post('/api/quotes').send(cuerpo);
    await request(app).post('/api/quotes').send(cuerpo);
    const tercera = await request(app).post('/api/quotes').send(cuerpo);
    expect(tercera.status).toBe(429);
  });

  it('solo existe POST: un GET no encuentra la ruta', async () => {
    const app = crearApp(dependenciasFalsas());
    expect((await request(app).get('/api/quotes')).status).toBe(404);
  });
});
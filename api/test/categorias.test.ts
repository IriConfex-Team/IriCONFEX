import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { CATEGORIAS_DE_PRUEBA, dependenciasFalsas } from './ayudas.js';

const app = crearApp(dependenciasFalsas());

describe('GET /api/categorias', () => {
  it('lista las categorías', async () => {
    const respuesta = await request(app).get('/api/categorias');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.categorias).toHaveLength(2);
  });
});

describe('GET /api/categorias/:codigo', () => {
  it('devuelve la categoría pedida', async () => {
    const respuesta = await request(app).get('/api/categorias/pijamas');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(CATEGORIAS_DE_PRUEBA[0]);
  });

  it('responde 404 si la categoría no existe', async () => {
    const respuesta = await request(app).get('/api/categorias/zapatos');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('responde 400 si el código tiene un formato inválido', async () => {
    const respuesta = await request(app).get('/api/categorias/PIJAMAS');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles[0].campo).toBe('params.codigo');
  });

  it('responde 400 si el código es demasiado largo', async () => {
    const respuesta = await request(app).get('/api/categorias/' + 'a'.repeat(41));

    expect(respuesta.status).toBe(400);
  });
});

describe('errores generales', () => {
  it('responde 404 en una ruta que no existe', async () => {
    const respuesta = await request(app).get('/api/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('RUTA_NO_ENCONTRADA');
  });

  it('responde 400 si el JSON viene mal formado', async () => {
    const respuesta = await request(app)
      .post('/api/categorias')
      .set('Content-Type', 'application/json')
      .send('{malo');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('JSON_INVALIDO');
  });
});

describe('CORS', () => {
  it('no permite orígenes externos si no se configuraron', async () => {
    const respuesta = await request(app).get('/api/health').set('Origin', 'https://malo.example');

    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('permite el origen configurado', async () => {
    const conCors = crearApp(dependenciasFalsas(), { origenesCors: ['https://iri-confex.vercel.app'] });

    const respuesta = await request(conCors)
      .get('/api/health')
      .set('Origin', 'https://iri-confex.vercel.app');

    expect(respuesta.headers['access-control-allow-origin']).toBe('https://iri-confex.vercel.app');
  });
});
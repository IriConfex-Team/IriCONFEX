import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { dependenciasFalsas } from './ayudas.js';

describe('GET /api/health', () => {
  it('responde 200 cuando la base de datos responde', async () => {
    const app = crearApp(dependenciasFalsas({ baseOk: true }));

    const respuesta = await request(app).get('/api/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/json/);
    expect(respuesta.body).toMatchObject({ estado: 'ok', baseDatos: 'ok', version: 'test' });
    expect(Number.isNaN(Date.parse(respuesta.body.hora))).toBe(false);
  });

  it('responde 503 cuando la base de datos no responde', async () => {
    const app = crearApp(dependenciasFalsas({ baseOk: false }));

    const respuesta = await request(app).get('/api/health');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body).toMatchObject({ estado: 'degradado', baseDatos: 'caida' });
  });
});
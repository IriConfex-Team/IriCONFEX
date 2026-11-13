import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { dependenciasFalsas } from './ayudas.js';

const app = crearApp(dependenciasFalsas());

describe('documentación OpenAPI', () => {
  it('publica la especificación en /api/openapi.json', async () => {
    const respuesta = await request(app).get('/api/openapi.json');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.openapi).toBe('3.1.0');
    expect(Object.keys(respuesta.body.paths)).toEqual(
      expect.arrayContaining(['/api/health', '/api/categorias', '/api/categorias/{codigo}', '/api/quotes', '/api/solicitudes']),
    );
    expect(respuesta.body.components.schemas.Error).toBeDefined();
  });

  it('sirve la pantalla de Swagger UI en /api/docs/', async () => {
    const respuesta = await request(app).get('/api/docs/');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/html/);
  });
});
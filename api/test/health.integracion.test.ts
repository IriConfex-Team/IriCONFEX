import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { crearDependencias } from '../src/contenedor.js';

describe.skipIf(!process.env.DATABASE_URL)('integración: /api/health con la base real', () => {
  // Importación dinámica: sin DATABASE_URL ni cliente generado, el archivo se omite sin fallar
  const cargarDb = () => import('../src/db.js');

  afterAll(async () => {
    if (process.env.DATABASE_URL) {
      const { prisma } = await cargarDb();
      await prisma.$disconnect();
    }
  });

  it('consulta PostgreSQL y responde 200', async () => {
    const { prisma } = await cargarDb();
    const app = crearApp(crearDependencias(prisma, 'integracion'));

    const respuesta = await request(app).get('/api/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.baseDatos).toBe('ok');
  });
});
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearApp } from '../src/app.js';
import type { RegistroSolicitud } from '../src/modulos/solicitudes/solicitudes.tipos.js';
import { dependenciasFalsas } from './ayudas.js';

const cuerpoValido = {
  categoria: 'pijamas',
  seleccion: { perfil: 'bebe', escote: 'redondo', entrega: 'retiro' },
  contacto: { nombre: 'Ana Mora', telefono: '88887777' },
  consentimiento: { aceptado: true, fecha: new Date().toISOString() },
};

afterEach(() => vi.restoreAllMocks());

describe('POST /api/solicitudes', () => {
  it('responde 201 con referencia, mensaje y enlace de WhatsApp', async () => {
    const registros: RegistroSolicitud[] = [];
    const app = crearApp(dependenciasFalsas({ registros }));
    const respuesta = await request(app).post('/api/solicitudes').send(cuerpoValido);

    expect(respuesta.status).toBe(201);
    expect(Object.keys(respuesta.body).sort()).toEqual(['enlaceWhatsapp', 'mensaje', 'referencia']);
    expect(respuesta.body.referencia).toMatch(/^[A-Z]{2,4}-[A-HJ-NP-Z2-9]{8}$/);
    expect(respuesta.body.mensaje).toContain(respuesta.body.referencia);
    expect(respuesta.body.mensaje).toContain('Ana Mora');
    expect(respuesta.body.mensaje).toContain('Retiro en el local');
    expect(respuesta.body.enlaceWhatsapp.startsWith('https://wa.me/50683413594?text=')).toBe(true);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      referencia: respuesta.body.referencia,
      perfilElegido: 'bebe',
      entrega: 'RETIRO',
      modalidadTalla: 'UNIVERSAL',
      nombreCliente: 'Ana Mora',
    });
  });

  it('con «Mis medidas» registra las medidas y las muestra en el mensaje', async () => {
    const registros: RegistroSolicitud[] = [];
    const app = crearApp(dependenciasFalsas({ registros }));
    const respuesta = await request(app)
      .post('/api/solicitudes')
      .send({
        ...cuerpoValido,
        seleccion: { ...cuerpoValido.seleccion, 'modalidad-talla': 'medida' },
        medidas: { 'ancho-espalda': 38.5 },
      });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toContain('- Ancho de espalda: 38,5');
    expect(registros[0].modalidadTalla).toBe('MEDIDA');
    expect(registros[0].medidas).toEqual({ 'ancho-espalda': 38.5 });
  });

  it('el mensaje nunca dice «pedido» y habla de precio solo como estimado', async () => {
    const app = crearApp(dependenciasFalsas());
    const { body } = await request(app).post('/api/solicitudes').send(cuerpoValido);
    expect(body.mensaje.toLowerCase()).not.toContain('pedido');
    expect(body.mensaje).toContain('Precio estimado');
  });

  it('responde 201 aunque falle el registro, y no registra datos personales', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = crearApp(dependenciasFalsas({ registroFalla: true }));
    const respuesta = await request(app).post('/api/solicitudes').send(cuerpoValido);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.enlaceWhatsapp).toContain('wa.me');
    const registrado = JSON.stringify(espia.mock.calls);
    expect(registrado).toContain(respuesta.body.referencia);
    expect(registrado).not.toContain('Ana Mora');
    expect(registrado).not.toContain('88887777');
  });

  it('responde 400 VALIDACION si el teléfono no es válido', async () => {
    const app = crearApp(dependenciasFalsas());
    const respuesta = await request(app)
      .post('/api/solicitudes')
      .send({ ...cuerpoValido, contacto: { nombre: 'Ana Mora', telefono: '1234567' } });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 400 VALIDACION si no aceptó el aviso de privacidad', async () => {
    const app = crearApp(dependenciasFalsas());
    const respuesta = await request(app)
      .post('/api/solicitudes')
      .send({ ...cuerpoValido, consentimiento: { aceptado: false, fecha: cuerpoValido.consentimiento.fecha } });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('rechaza campos que no están en el contrato (el esquema es estricto)', async () => {
    const app = crearApp(dependenciasFalsas());
    const respuesta = await request(app)
      .post('/api/solicitudes')
      .send({ ...cuerpoValido, colores: [{ pieza: 'arriba', nombre: 'rojo' }] });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 400 SELECCION_INVALIDA si la selección viola las reglas', async () => {
    const app = crearApp(dependenciasFalsas({ reglas: ['escote: no disponible para bebé'] }));
    const respuesta = await request(app).post('/api/solicitudes').send(cuerpoValido);
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('SELECCION_INVALIDA');
    expect(respuesta.body.error.detalles[0].mensaje).toContain('escote');
  });

  it('responde 429 cuando se pasa del límite de envíos', async () => {
    const app = crearApp(dependenciasFalsas(), { limiteSolicitudes: 2 });
    await request(app).post('/api/solicitudes').send(cuerpoValido);
    await request(app).post('/api/solicitudes').send(cuerpoValido);
    const tercera = await request(app).post('/api/solicitudes').send(cuerpoValido);
    expect(tercera.status).toBe(429);
    expect(tercera.body.error.codigo).toBe('DEMASIADAS_SOLICITUDES');
  });
});

describe('el navegador no puede leer solicitudes (HU-25 CA2)', () => {
  it('no existe ningún GET, PUT ni DELETE de solicitudes', async () => {
    const app = crearApp(dependenciasFalsas());
    for (const metodo of ['get', 'put', 'delete'] as const) {
      const respuesta = await request(app)[metodo]('/api/solicitudes');
      expect(respuesta.status).toBe(404);
    }
    const porReferencia = await request(app).get('/api/solicitudes/IC-ABCD2345');
    expect(porReferencia.status).toBe(404);
  });

  it('no abre CORS a un origen no configurado', async () => {
    const app = crearApp(dependenciasFalsas(), { origenesCors: ['https://iri-confex.vercel.app'] });
    const respuesta = await request(app)
      .post('/api/solicitudes')
      .set('Origin', 'https://malo.example')
      .send(cuerpoValido);
    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });
});
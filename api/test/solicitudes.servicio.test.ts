import { describe, expect, it } from 'vitest';
import { crearSolicitudesService } from '../src/modulos/solicitudes/solicitudes.servicio.js';
import type { RegistroSolicitud } from '../src/modulos/solicitudes/solicitudes.tipos.js';
import { CONFIG_MENSAJE_DE_PRUEBA } from './ayudas.js';

const solicitud = {
  categoria: 'pijamas',
  seleccion: { perfil: 'bebe', escote: 'redondo' },
  contacto: { nombre: 'Ana Mora', telefono: '88887777' },
  consentimiento: { aceptado: true, fecha: '2026-11-06T18:00:00.000Z' },
} as never;

describe('crearSolicitudesService', () => {
  it('genera otra referencia si la primera ya existe', async () => {
    const referencias = ['IC-AAAAAAAA', 'IC-BBBBBBBB'];
    const guardados: RegistroSolicitud[] = [];
    let llamadas = 0;
    const servicio = crearSolicitudesService({
      repositorio: {
        registrar: async (registro) => {
          llamadas++;
          if (llamadas === 1) throw Object.assign(new Error('unique'), { code: 'P2002' });
          guardados.push(registro);
        },
      },
      verificarReglas: async () => [],
      configMensaje: CONFIG_MENSAJE_DE_PRUEBA,
      numeroWhatsapp: '83413594',
      version: 'test',
      generarReferencia: () => referencias.shift() as string,
    });

    const respuesta = await servicio.crear(solicitud);

    expect(llamadas).toBe(2);
    expect(respuesta.referencia).toBe('IC-BBBBBBBB');
    expect(respuesta.mensaje).toContain('IC-BBBBBBBB');
    expect(respuesta.mensaje).not.toContain('IC-AAAAAAAA');
    expect(guardados[0].mensajeWhatsapp).toBe(respuesta.mensaje);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { eliminarSolicitudesVencidas } from '../src/jobs/eliminarVencidas.js';

function clienteFalso(count: number) {
  return {
    solicitud: { deleteMany: vi.fn().mockResolvedValue({ count }) },
    registroEliminacion: { create: vi.fn().mockResolvedValue({}) },
  };
}

describe('eliminarSolicitudesVencidas', () => {
  it('borra las solicitudes anteriores a la fecha dada y registra la cantidad', async () => {
    const cliente = clienteFalso(3);
    const ahora = new Date('2026-11-01T00:00:00Z');

    const borradas = await eliminarSolicitudesVencidas(cliente, ahora);

    expect(borradas).toBe(3);
    expect(cliente.solicitud.deleteMany).toHaveBeenCalledWith({
      where: { fechaVencimiento: { lt: ahora } },
    });
    expect(cliente.registroEliminacion.create).toHaveBeenCalledWith({
      data: { cantidadEliminada: 3 },
    });
  });

  it('registra la corrida aunque no haya nada que borrar', async () => {
    const cliente = clienteFalso(0);

    const borradas = await eliminarSolicitudesVencidas(cliente);

    expect(borradas).toBe(0);
    expect(cliente.registroEliminacion.create).toHaveBeenCalledWith({
      data: { cantidadEliminada: 0 },
    });
  });
});

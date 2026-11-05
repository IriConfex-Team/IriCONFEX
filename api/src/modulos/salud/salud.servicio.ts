import type { RespuestaSalud } from './salud.esquemas.js';
import type { SaludRepository } from './salud.repositorio.js';

export interface SaludService {
  obtenerEstado(): Promise<RespuestaSalud>;
}

export function crearSaludService(repositorio: SaludRepository, info: { version: string }): SaludService {
  return {
    async obtenerEstado() {
      const baseOk = await repositorio.verificarConexion();
      return {
        estado: baseOk ? 'ok' : 'degradado',
        baseDatos: baseOk ? 'ok' : 'caida',
        version: info.version,
        hora: new Date().toISOString(),
      };
    },
  };
}
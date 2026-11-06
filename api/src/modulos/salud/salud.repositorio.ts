import type { PrismaClient } from '../../../generated/prisma/client.js';

export interface SaludRepository {
  verificarConexion(): Promise<boolean>;
}

const ESPERA_MAXIMA_MS = 2000;

export function crearSaludRepository(prisma: Pick<PrismaClient, '$queryRaw'>): SaludRepository {
  return {
    async verificarConexion() {
      let temporizador: NodeJS.Timeout | undefined;
      const vencido = new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(new Error('La base no respondió a tiempo')),
          ESPERA_MAXIMA_MS,
        );
      });
      try {
        await Promise.race([prisma.$queryRaw`SELECT 1`, vencido]);
        return true;
      } catch (error) {
        console.error('Health: falló la consulta a la base de datos', error);
        return false;
      } finally {
        clearTimeout(temporizador);
      }
    },
  };
}
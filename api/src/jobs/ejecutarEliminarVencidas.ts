import { prisma } from '../db.js';
import { eliminarSolicitudesVencidas, type ClienteEliminacion } from './eliminarVencidas.js';

async function main() {
  const borradas = await eliminarSolicitudesVencidas(prisma as unknown as ClienteEliminacion);
  console.log('Solicitudes vencidas eliminadas: ' + borradas);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from '../db';

export async function eliminarSolicitudesVencidas(): Promise<number> {
  const { count } = await prisma.solicitud.deleteMany({
    where: { fechaVencimiento: { lt: new Date() } },
  });
  await prisma.registroEliminacion.create({ data: { cantidadEliminada: count } });
  return count;
}
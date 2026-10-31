// Lo mínimo que necesita la función: así se puede probar sin una base de datos real
export interface ClienteEliminacion {
  solicitud: {
    deleteMany(args: { where: { fechaVencimiento: { lt: Date } } }): Promise<{ count: number }>;
  };
  registroEliminacion: {
    create(args: { data: { cantidadEliminada: number } }): Promise<unknown>;
  };
}

export async function eliminarSolicitudesVencidas(
  cliente: ClienteEliminacion,
  ahora: Date = new Date(),
): Promise<number> {
  const { count } = await cliente.solicitud.deleteMany({
    where: { fechaVencimiento: { lt: ahora } },
  });
  await cliente.registroEliminacion.create({ data: { cantidadEliminada: count } });
  return count;
}

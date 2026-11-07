import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { RegistroSolicitud, SolicitudesRepository } from './solicitudes.tipos.js';

// Los ids del JSON usan guion (ancho-espalda); campo_medida.codigo usa guion bajo (ancho_espalda)
export const aCodigoDeMedida = (id: string) => id.replace(/-/g, '_');

type Cliente = Pick<PrismaClient, 'solicitud' | 'perfil' | 'avisoPrivacidad' | 'campoMedida'>;

export function crearSolicitudesRepository(prisma: Cliente): SolicitudesRepository {
  return {
    async registrar(r: RegistroSolicitud) {
      // AJUSTA los campos de Perfil si TypeScript los marca
      const perfil = await prisma.perfil.findFirst({
        where: { codigo: r.perfilElegido, categoria: { codigo: r.categoria } },
        select: { id: true },
      });
      if (!perfil) throw new Error('PERFIL_NO_ENCONTRADO');

      // AJUSTA: el aviso vigente (aquí, el más reciente)
      const aviso = await prisma.avisoPrivacidad.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      if (!aviso) throw new Error('AVISO_NO_ENCONTRADO');

      const entradas = Object.entries(r.medidas ?? {});
      let medidas: { campoMedidaId: number; valorCm: number }[] = [];
      if (entradas.length > 0) {
        const campos = await prisma.campoMedida.findMany({
          where: {
            codigo: { in: entradas.map(([id]) => aCodigoDeMedida(id)) },
            categoria: { codigo: r.categoria },
          },
          select: { id: true, codigo: true },
        });
        const idPorCodigo = new Map(campos.map((c) => [c.codigo, c.id]));
        medidas = entradas.map(([id, valor]) => {
          const campoMedidaId = idPorCodigo.get(aCodigoDeMedida(id));
          if (campoMedidaId === undefined) throw new Error('CAMPO_MEDIDA_NO_ENCONTRADO');
          return { campoMedidaId, valorCm: Math.round(valor * 10) / 10 }; // Decimal(5,1)
        });
      }

      await prisma.solicitud.create({
        data: {
          referencia: r.referencia,
          perfilId: perfil.id,
          nombreCliente: r.nombreCliente,
          telefono: r.telefono,
          selecciones: r.seleccion,
          modalidadTalla: r.modalidadTalla,
          entrega: r.entrega,
          precioEstimadoCrc: r.precioEstimadoCrc,
          avisoId: aviso.id,
          avisoAceptadoEn: r.avisoAceptadoEn,
          versionConfiguracion: r.versionConfiguracion,
          mensajeWhatsapp: r.mensajeWhatsapp,
          fechaVencimiento: r.fechaVencimiento,
          medidas: medidas.length > 0 ? { create: medidas } : undefined,
        },
      });
    },
  };
}
export interface SolicitudEntrada {
  categoria: string;
  nombre: string;
  telefono: string;
  seleccion: Record<string, string>;
  medidas?: Record<string, number>;
  consentimientoEn: Date;
}

export interface RegistroSolicitud {
  referencia: string;
  categoria: string; // solo para buscar el perfil y los campos de medida
  perfilElegido: string; // código del perfil (seleccion.perfil)
  nombreCliente: string;
  telefono: string;
  seleccion: Record<string, string>;
  medidas?: Record<string, number>;
  modalidadTalla: 'UNIVERSAL' | 'MEDIDA' | 'PRESENCIAL'; // AJUSTA al enum de Prisma
  entrega: 'RETIRO' | 'ENVIO'; // AJUSTA al enum de Prisma
  precioEstimadoCrc: number | null;
  avisoAceptadoEn: Date;
  versionConfiguracion: string;
  mensajeWhatsapp: string;
  fechaVencimiento: Date;
}

export interface SolicitudesRepository {
  registrar(registro: RegistroSolicitud): Promise<void>;
}

// El cálculo del precio (HU-18) se conecta aquí cuando exista
export interface PrecioService {
  calcular(entrada: SolicitudEntrada): Promise<number | null>;
}
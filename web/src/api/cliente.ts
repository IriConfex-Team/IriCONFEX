import type { SolicitudCotizacion } from '@iriconfex/shared';

// Vite incrusta VITE_API_URL al compilar. Con envDir: '..' lee el .env de la raíz del monorepo.
// Sin la variable, en desarrollo se usa la API local.
const BASE = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

// En el plan gratis, Render puede tardar ~50 s en despertar tras inactividad
const ESPERA_MAXIMA_MS = 70_000;

export interface RespuestaSolicitud {
  referencia: string;
  mensaje: string;
  enlaceWhatsapp: string;
}

export class ErrorApi extends Error {
  readonly estado: number;
  readonly codigo: string;
  readonly detalles: { campo: string; mensaje: string }[];

  constructor(
    estado: number,
    codigo: string,
    mensaje: string,
    detalles: { campo: string; mensaje: string }[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export async function enviarSolicitud(solicitud: SolicitudCotizacion): Promise<RespuestaSolicitud> {
  let respuesta: Response;
  try {
    respuesta = await fetch(BASE + '/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solicitud),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
  } catch {
    throw new ErrorApi(
      0,
      'SIN_CONEXION',
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (respuesta.status === 201) return (await respuesta.json()) as RespuestaSolicitud;

  const cuerpo = (await respuesta.json().catch(() => null)) as {
    error?: { codigo?: string; mensaje?: string; detalles?: { campo: string; mensaje: string }[] };
  } | null;

  throw new ErrorApi(
    respuesta.status,
    cuerpo?.error?.codigo ?? 'ERROR',
    cuerpo?.error?.mensaje ?? 'No se pudo enviar la solicitud',
    cuerpo?.error?.detalles ?? [],
  );
}
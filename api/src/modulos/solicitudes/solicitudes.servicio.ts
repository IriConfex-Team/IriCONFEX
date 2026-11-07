import { ErrorSeleccionInvalida } from '../../comun/errores.js';
import { generarReferencia } from '../../comun/referencia.js';
import { urlWhatsapp } from '../../comun/whatsapp.js';
import type { RespuestaSolicitud, SolicitudWeb } from './solicitudes.esquemas.js';
import { desdeEsquema, entregaDe, modalidadTallaDe, CONVENCIONES } from './solicitudes.mapeo.js';
import { armarMensaje, type ConfigMensaje } from './solicitudes.mensaje.js';
import type {
  PrecioService,
  SolicitudEntrada,
  SolicitudesRepository,
} from './solicitudes.tipos.js';

export interface SolicitudesService {
  crear(solicitud: SolicitudWeb): Promise<RespuestaSolicitud>;
}

export interface DependenciasSolicitudes {
  repositorio: SolicitudesRepository;
  verificarReglas: (entrada: SolicitudEntrada) => Promise<string[]>;
  configMensaje: ConfigMensaje;
  numeroWhatsapp: string;
  version: string;
  precio?: PrecioService;
  ahora?: () => Date;
  generarReferencia?: () => string;
}

const INTENTOS_REFERENCIA = 3;
// AJUSTA: vigencia de la cotización según el Anexo A
const DIAS_VIGENCIA = 15;

// Prisma lanza P2002 cuando se viola un índice único (referencia repetida)
function esReferenciaRepetida(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

// Nunca se registra el mensaje del error: puede traer el nombre o el teléfono (Ley 8968)
function codigoDe(error: unknown): string {
  const e = error as { code?: unknown; message?: unknown } | null;
  if (typeof e?.code === 'string') return e.code;
  if (typeof e?.message === 'string' && /^[A-Z_]+$/.test(e.message)) return e.message;
  return 'DESCONOCIDO';
}

export function crearSolicitudesService(deps: DependenciasSolicitudes): SolicitudesService {
  const ahora = deps.ahora ?? (() => new Date());
  const nuevaReferencia = deps.generarReferencia ?? (() => generarReferencia());

  return {
    async crear(solicitud) {
      const entrada = desdeEsquema(solicitud);

      const errores = await deps.verificarReglas(entrada);
      if (errores.length > 0) {
        throw new ErrorSeleccionInvalida(errores.map((mensaje) => ({ campo: 'seleccion', mensaje })));
      }

      // Si el cálculo del precio falla, la solicitud sigue: «a confirmar»
      let precio: number | null = null;
      try {
        precio = deps.precio ? await deps.precio.calcular(entrada) : null;
      } catch {
        precio = null;
      }

      const fecha = ahora();
      const vence = new Date(fecha.getTime() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000);

      let referencia = nuevaReferencia();
      let mensaje = armarMensaje(deps.configMensaje, { referencia, entrada, precioEstimadoCrc: precio });

      for (let intento = 1; intento <= INTENTOS_REFERENCIA; intento++) {
        try {
          await deps.repositorio.registrar({
            referencia,
            categoria: entrada.categoria,
            perfilElegido: entrada.seleccion[CONVENCIONES.pasoPerfil] ?? '',
            nombreCliente: entrada.nombre,
            telefono: entrada.telefono,
            seleccion: entrada.seleccion,
            medidas: entrada.medidas,
            modalidadTalla: modalidadTallaDe(entrada),
            entrega: entregaDe(entrada),
            precioEstimadoCrc: precio,
            avisoAceptadoEn: entrada.consentimientoEn,
            versionConfiguracion: deps.version.slice(0, 20), // VarChar(20)
            mensajeWhatsapp: mensaje,
            fechaVencimiento: vence,
          });
          break;
        } catch (error) {
          if (esReferenciaRepetida(error) && intento < INTENTOS_REFERENCIA) {
            referencia = nuevaReferencia();
            mensaje = armarMensaje(deps.configMensaje, { referencia, entrada, precioEstimadoCrc: precio });
            continue;
          }
          // HU-25 CA3: el registro falló, pero el cliente igual recibe su mensaje
          console.error(
            'Solicitud ' + referencia + ': no se pudo registrar (código ' + codigoDe(error) + ')',
          );
          break;
        }
      }

      return {
        referencia,
        mensaje,
        enlaceWhatsapp: urlWhatsapp(deps.numeroWhatsapp, mensaje),
      };
    },
  };
}

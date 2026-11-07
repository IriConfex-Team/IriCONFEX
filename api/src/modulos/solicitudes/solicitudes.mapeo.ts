import { validarMedidas, validarSeleccion } from '@iriconfex/shared';
import type { ConfiguracionNegocio } from '../../comun/configuracion.js';
import type { SolicitudWeb } from './solicitudes.esquemas.js';
import type { ConfigMensaje } from './solicitudes.mensaje.js';
import type { SolicitudEntrada } from './solicitudes.tipos.js';

// Ids que la API necesita conocer. Salen del pijamas.json (no son prendas, telas ni precios).
export const CONVENCIONES = {
  categoriaSoportada: 'pijamas',
  pasoPerfil: 'perfil',
  pasoModalidadTalla: 'modalidad-talla',
  valorPresencial: 'presencial', // AJUSTA al id real de la opción de modalidad-talla
  pasoEntrega: 'entrega',
  valorEnvio: 'envio', // hoy el catálogo solo ofrece «retiro»
} as const;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function desdeEsquema(s: SolicitudWeb): SolicitudEntrada {
  const declarada = new Date(s.consentimiento.fecha);
  const ahora = new Date();
  // Si la fecha del navegador es inválida o se aleja más de un día, manda la del servidor
  const confiable =
    !Number.isNaN(declarada.getTime()) && Math.abs(ahora.getTime() - declarada.getTime()) <= UN_DIA_MS;
  return {
    categoria: s.categoria,
    nombre: s.contacto.nombre,
    telefono: s.contacto.telefono,
    seleccion: s.seleccion,
    medidas: s.medidas,
    consentimientoEn: confiable ? declarada : ahora,
  };
}

export function entregaDe(entrada: SolicitudEntrada): 'RETIRO' | 'ENVIO' {
  return entrada.seleccion[CONVENCIONES.pasoEntrega] === CONVENCIONES.valorEnvio ? 'ENVIO' : 'RETIRO';
}

export function modalidadTallaDe(entrada: SolicitudEntrada): 'UNIVERSAL' | 'MEDIDA' | 'PRESENCIAL' {
  if (entrada.medidas && Object.keys(entrada.medidas).length > 0) return 'MEDIDA';
  if (entrada.seleccion[CONVENCIONES.pasoModalidadTalla] === CONVENCIONES.valorPresencial) {
    return 'PRESENCIAL';
  }
  return 'UNIVERSAL';
}

// ErrorSeleccion y ErrorMedidas traen un tipo y, según el caso, el paso o el campo
function textoDeError(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const mensaje = o.mensaje ?? o.message;
    if (typeof mensaje === 'string') return mensaje;
    const partes = ['tipo', 'paso', 'campo', 'opcion', 'id']
      .map((clave) => o[clave])
      .filter((valor): valor is string => typeof valor === 'string');
    if (partes.length > 0) return partes.join(' · ');
  }
  return 'Valor no válido';
}

// Reglas del Anexo A (shared). Devuelve la lista de problemas; vacía si todo está bien.
export async function verificarReglas(
  config: ConfiguracionNegocio,
  entrada: SolicitudEntrada,
): Promise<string[]> {
  if (entrada.categoria !== CONVENCIONES.categoriaSoportada) {
    return ['categoria: la categoría «' + entrada.categoria + '» no está disponible'];
  }
  const seleccion = validarSeleccion(config, entrada.seleccion);
  const medidas = validarMedidas(config, entrada.seleccion, entrada.medidas);
  return [...seleccion.errores, ...medidas.errores].map(textoDeError);
}

// --- Piezas del pijamas.json -------------------------------------------------------

// Busca en «medidas» cualquier objeto con id y nombre (por ejemplo, ancho-espalda → «Ancho de espalda»)
function nombresDeMedidas(nodo: unknown, mapa: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(nodo)) {
    for (const elemento of nodo) nombresDeMedidas(elemento, mapa);
  } else if (nodo && typeof nodo === 'object') {
    const o = nodo as Record<string, unknown>;
    if (typeof o.id === 'string' && typeof o.nombre === 'string') mapa[o.id] = o.nombre;
    for (const valor of Object.values(o)) nombresDeMedidas(valor, mapa);
  }
  return mapa;
}

export function aConfigMensaje(config: ConfiguracionNegocio): ConfigMensaje {
  const c = config as unknown as {
    pasos?: ConfigMensaje['pasos'];
    resumen?: { secciones?: ConfigMensaje['secciones'] };
    medidas?: unknown;
  };
  return {
    pasos: c.pasos ?? [],
    secciones: c.resumen?.secciones ?? [],
    pasoMedidas: CONVENCIONES.pasoModalidadTalla,
    nombresMedida: nombresDeMedidas(c.medidas),
  };
}

export function versionDe(config: ConfiguracionNegocio): string {
  return String((config as unknown as { version?: unknown }).version ?? '1');
}

export function whatsappDe(config: ConfiguracionNegocio, respaldo: string): string {
  const numero = (config as unknown as { negocio?: { whatsapp?: unknown } }).negocio?.whatsapp;
  return typeof numero === 'string' && numero !== '' ? numero : respaldo;
}
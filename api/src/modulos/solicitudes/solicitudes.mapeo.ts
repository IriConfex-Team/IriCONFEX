import { nombreDelColor, validarColores, validarMedidas, validarSeleccion } from '@iriconfex/shared';
import type { ConfiguracionNegocio } from '../../comun/configuracion.js';
import type { SolicitudWeb } from './solicitudes.esquemas.js';
import type { ConfigMensaje } from './solicitudes.mensaje.js';
import type { SolicitudEntrada } from './solicitudes.tipos.js';

// Ids que la API necesita conocer. Salen del pijamas.json (no son prendas, telas ni precios).
export const CONVENCIONES = {
  categoriaSoportada: 'pijamas',
  pasoPerfil: 'perfil',
  pasoModalidadTalla: 'modalidad-talla',
  valorPresencial: 'presencial',
  pasoEntrega: 'entrega',
  valorEnvio: 'envio',
} as const;

const LIMITE_SENAS_ENVIO = 200;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function desdeEsquema(s: SolicitudWeb): SolicitudEntrada {
  const declarada = new Date(s.consentimiento.fecha);
  const ahora = new Date();
  const confiable =
    !Number.isNaN(declarada.getTime()) && Math.abs(ahora.getTime() - declarada.getTime()) <= UN_DIA_MS;
  return {
    categoria: s.categoria,
    nombre: s.contacto.nombre,
    telefono: s.contacto.telefono,
    seleccion: s.seleccion,
    medidas: s.medidas,
    colores: s.colores,
    consentimientoEn: confiable ? declarada : ahora,
  };
}

export function entregaDe(entrada: SolicitudEntrada): 'RETIRO' | 'ENVIO' {
  const valor = entrada.seleccion[CONVENCIONES.pasoEntrega] ?? '';
  return valor === CONVENCIONES.valorEnvio || valor.startsWith(`${CONVENCIONES.valorEnvio}:`)
    ? 'ENVIO'
    : 'RETIRO';
}

export function modalidadTallaDe(entrada: SolicitudEntrada): 'UNIVERSAL' | 'MEDIDA' | 'PRESENCIAL' {
  if (entrada.medidas && Object.keys(entrada.medidas).length > 0) return 'MEDIDA';
  if (entrada.seleccion[CONVENCIONES.pasoModalidadTalla] === CONVENCIONES.valorPresencial) {
    return 'PRESENCIAL';
  }
  return 'UNIVERSAL';
}

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

export function formatearEntrega(valor: string): string {
  if (valor.startsWith('envio:')) {
    const [provincia = '', canton = '', distrito = '', senas = ''] = valor
      .slice('envio:'.length)
      .split('|');
    return `Envío a domicilio — ${provincia}, ${canton}, ${distrito}. Señas: ${senas} (El costo del envío lo confirma la costurera)`;
  }
  return valor;
}

/** Valida HU-17: si eligió envío, exige provincia, cantón, distrito y señas <= 200 caracteres. */
function validarEntrega(seleccion: Record<string, string>): string[] {
  const valor = seleccion[CONVENCIONES.pasoEntrega];
  if (!valor || valor === 'retiro') return [];

  if (!valor.startsWith('envio:')) {
    return ['entrega: modalidad de entrega no válida'];
  }

  const [provincia = '', canton = '', distrito = '', senas = ''] = valor
    .slice('envio:'.length)
    .split('|');

  const errores: string[] = [];
  if (!provincia.trim()) errores.push('entrega: selecciona una provincia');
  if (!canton.trim()) errores.push('entrega: selecciona un cantón');
  if (!distrito.trim()) errores.push('entrega: selecciona un distrito');
  if (!senas.trim()) {
    errores.push('entrega: indica las señas exactas para el envío');
  } else if (senas.trim().length > LIMITE_SENAS_ENVIO) {
    errores.push(`entrega: las señas deben tener ${LIMITE_SENAS_ENVIO} caracteres o menos`);
  }
  return errores;
}

/** Inyecta en memoria las opciones dinámicas del destino de envío para `validarSeleccion`. */
function configConEntregaDinamica(
  config: ConfiguracionNegocio,
  seleccion: Record<string, string>,
): ConfiguracionNegocio {
  const valor = seleccion[CONVENCIONES.pasoEntrega];
  if (!valor || !valor.startsWith('envio:')) return config;

  const c = config as unknown as {
    pasos?: Array<{ id: string; opciones?: Array<{ id: string; nombre: string }> }>;
  };
  if (!Array.isArray(c.pasos)) return config;

  const pasosActualizados = c.pasos.map((paso) => {
    if (paso.id !== CONVENCIONES.pasoEntrega) return paso;
    const yaExiste = paso.opciones?.some((o) => o.id === valor);
    if (yaExiste) return paso;
    return {
      ...paso,
      opciones: [...(paso.opciones ?? []), { id: valor, nombre: formatearEntrega(valor) }],
    };
  });

  return { ...config, pasos: pasosActualizados } as unknown as ConfiguracionNegocio;
}

// Reglas del Anexo A (shared). Devuelve la lista de problemas; vacía si todo está bien.
export async function verificarReglas(
  config: ConfiguracionNegocio,
  entrada: SolicitudEntrada,
): Promise<string[]> {
  if (entrada.categoria !== CONVENCIONES.categoriaSoportada) {
    return ['categoria: la categoría «' + entrada.categoria + '» no está disponible'];
  }

  const erroresEntrega = validarEntrega(entrada.seleccion);
  const configEfectiva = configConEntregaDinamica(config, entrada.seleccion);
  const seleccion = validarSeleccion(configEfectiva, entrada.seleccion);
  const medidas = validarMedidas(configEfectiva, entrada.seleccion, entrada.medidas);
  const colores = validarColores(configEfectiva, entrada.seleccion, entrada.colores);
  return [
    ...seleccion.errores.map(textoDeError),
    ...medidas.errores.map(textoDeError),
    ...colores.errores.map(textoDeError),
    ...erroresEntrega,
  ];
}

// --- Piezas del pijamas.json -------------------------------------------------------

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
    // HU-12a: el color va debajo de la tela a la que pertenece
    colores: config.colores
      ? {
          pasos: config.colores.pasos,
          nombre: (tela, elegido) => nombreDelColor(config, tela, elegido),
        }
      : undefined,
  };
}

export function versionDe(config: ConfiguracionNegocio): string {
  return String((config as unknown as { version?: unknown }).version ?? '1');
}

export function whatsappDe(config: ConfiguracionNegocio, respaldo: string): string {
  const numero = (config as unknown as { negocio?: { whatsapp?: unknown } }).negocio?.whatsapp;
  return typeof numero === 'string' && numero !== '' ? numero : respaldo;
}
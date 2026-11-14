import { formatearTelefono } from '../../comun/whatsapp.js';
import type { SolicitudEntrada } from './solicitudes.tipos.js';

export interface ConfigMensaje {
  pasos: { id: string; nombre: string; opciones: { id: string; nombre: string }[] }[];
  secciones: { titulo: string; pasos: string[] }[];
  pasoMedidas?: string; // las medidas se muestran en la sección que contiene este paso
  nombresMedida?: Record<string, string>;
}

export interface DatosMensaje {
  referencia: string;
  entrada: SolicitudEntrada;
  precioEstimadoCrc: number | null;
}

const PASOS_COLOR = new Set(['color-superior', 'color-inferior']);

const sinSignos = (rotulo: string) => rotulo.replace(/[¿?]/g, '').trim();

function formatearColor(valor: string): string {
  if (valor.startsWith('catálogo:')) {
    return `${valor.slice('catálogo:'.length).trim()} (catálogo)`;
  }
  if (valor.startsWith('personalizado:')) {
    const texto = valor.slice('personalizado:'.length).trim();
    return texto ? `${texto} (personalizado)` : 'Sin preferencia de color';
  }
  return valor;
}

function rotuloDeMedida(id: string, nombres?: Record<string, string>): string {
  const nombre = nombres?.[id];
  if (nombre) return nombre;
  const texto = id.replace(/-/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const formatearColones = (monto: number) => String(monto).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function armarMensaje(config: ConfigMensaje, datos: DatosMensaje): string {
  const { referencia, entrada, precioEstimadoCrc } = datos;
  const lineas: string[] = [];

  lineas.push('*Solicitud de cotización ' + referencia + '*');
  lineas.push('Nombre: ' + entrada.nombre);
  lineas.push('Teléfono: ' + formatearTelefono(entrada.telefono));

  const pasosPorId = new Map(config.pasos.map((p) => [p.id, p]));
  const formatearValorPaso = (idPaso: string, elegida: string): string => {
    if (PASOS_COLOR.has(idPaso)) return formatearColor(elegida);
    const paso = pasosPorId.get(idPaso);
    const opcion = paso?.opciones.find((o) => o.id === elegida);
    return opcion?.nombre ?? elegida;
  };

  const medidas = Object.entries(entrada.medidas ?? {});
  const lineasMedidas =
    medidas.length > 0
      ? [
          'Medidas (cm):',
          ...medidas.map(
            ([id, valor]) =>
              '- ' + rotuloDeMedida(id, config.nombresMedida) + ': ' + String(valor).replace('.', ','),
          ),
        ]
      : [];
  let medidasListas = false;

  const pasosUsados = new Set<string>();

  for (const seccion of config.secciones) {
    const bloque: string[] = [];
    for (const idPaso of seccion.pasos) {
      pasosUsados.add(idPaso);
      const elegida = entrada.seleccion[idPaso];
      if (elegida === undefined) continue; // no aplica: se omite (HU-22 CA2)
      const paso = pasosPorId.get(idPaso);
      bloque.push(sinSignos(paso?.nombre ?? idPaso) + ': ' + formatearValorPaso(idPaso, elegida));
    }
    const llevaMedidas =
      lineasMedidas.length > 0 &&
      config.pasoMedidas !== undefined &&
      seccion.pasos.includes(config.pasoMedidas);
    if (bloque.length === 0 && !llevaMedidas) continue;

    lineas.push('*' + seccion.titulo + '*', ...bloque);
    if (llevaMedidas) {
      lineas.push(...lineasMedidas);
      medidasListas = true;
    }
  }

  // Pasos fuera de `secciones` (ej. color-superior, color-inferior)
  const otrosBloque: string[] = [];
  for (const paso of config.pasos) {
    if (pasosUsados.has(paso.id)) continue;
    const elegida = entrada.seleccion[paso.id];
    if (elegida === undefined) continue;
    otrosBloque.push(sinSignos(paso.nombre) + ': ' + formatearValorPaso(paso.id, elegida));
  }
  if (otrosBloque.length > 0) {
    lineas.push('*Colores*', ...otrosBloque);
  }

  if (lineasMedidas.length > 0 && !medidasListas) lineas.push(...lineasMedidas);

  if (precioEstimadoCrc === null) {
    lineas.push('Precio estimado: a confirmar por la costurera');
  } else {
    lineas.push(
      'Precio estimado: ₡' +
        formatearColones(precioEstimadoCrc) +
        ' (estimado, sujeto a confirmación)',
    );
  }

  return lineas.join('\n');
}
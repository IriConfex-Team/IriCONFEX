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

const sinSignos = (rotulo: string) => rotulo.replace(/[¿?]/g, '').trim();

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

  for (const seccion of config.secciones) {
    const bloque: string[] = [];
    for (const idPaso of seccion.pasos) {
      const elegida = entrada.seleccion[idPaso];
      if (elegida === undefined) continue; // no aplica: se omite (HU-22 CA2)
      const paso = pasosPorId.get(idPaso);
      const opcion = paso?.opciones.find((o) => o.id === elegida);
      bloque.push(sinSignos(paso?.nombre ?? idPaso) + ': ' + (opcion?.nombre ?? elegida));
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
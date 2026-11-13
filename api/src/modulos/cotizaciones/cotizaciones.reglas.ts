import { evaluarFlujo, validarSeleccion } from '@iriconfex/shared';
import type { DetalleError } from '../../comun/errores.js';
import type { ConfiguracionNegocio } from '../../comun/configuracion.js';
import { CONVENCIONES } from '../solicitudes/solicitudes.mapeo.js';
import type { EntradaCotizacion } from './cotizaciones.tipos.js';

/**
 * Reglas del Anexo A aplicadas a la selección que llega a /api/quotes.
 *
 * La web pide el precio MIENTRAS el cliente configura, así que la selección suele estar a medias:
 *  - Selección completa → revalidación estricta (`validarSeleccion`), la misma que se usa al aceptar una solicitud.
 *    Ojo: `validarSeleccion` está hecha SOLO para selecciones terminadas. A medias da falsos errores
 *    (p. ej. rechaza el escote «redondo» porque la tela de arriba, que se elige después, aún no existe).
 *  - Selección en curso → `evaluarFlujo`, que sí entiende lo pendiente. Solo se rechaza lo imposible:
 *    pasos u opciones que no existen y conflictos reales (cuello camisero con brush, por ejemplo).
 */
export function revisarSeleccionParaPrecio(
  configuracion: ConfiguracionNegocio,
  { categoria, seleccion }: EntradaCotizacion,
): DetalleError[] {
  if (categoria !== CONVENCIONES.categoriaSoportada) {
    return [{ campo: 'categoria', mensaje: 'La categoría «' + categoria + '» no está disponible' }];
  }

  const estado = evaluarFlujo(configuracion, seleccion);
  const revision = validarSeleccion(configuracion, seleccion);

  if (estado.completo) {
    return revision.errores.map((e) => ({ campo: e.paso, mensaje: e.mensaje }));
  }

  const imposibles = revision.errores
    .filter((e) => e.tipo === 'paso-desconocido' || e.tipo === 'opcion-desconocida')
    .map((e) => ({ campo: e.paso, mensaje: e.mensaje }));
  const conflictos = estado.conflictos.map((c) => ({
    campo: c.paso,
    mensaje: c.mensaje ?? 'La elección en «' + c.paso + '» no es compatible con lo que elegiste después.',
  }));
  return [...imposibles, ...conflictos];
}
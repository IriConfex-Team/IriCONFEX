import { ErrorSeleccionInvalida, type DetalleError } from '../../comun/errores.js';
import { calcularPrecio } from './cotizaciones.calculo.js';
import type { Cotizacion, CotizacionesRepository, EntradaCotizacion } from './cotizaciones.tipos.js';

export interface CotizacionesService {
  cotizar(entrada: EntradaCotizacion): Promise<Cotizacion>;
}

export interface DependenciasCotizaciones {
  repositorio: CotizacionesRepository;
  /** Problemas de la selección (reglas del Anexo A). Se ignora lo que simplemente aún falta elegir. */
  revisarSeleccion: (entrada: EntradaCotizacion) => DetalleError[];
}

export function crearCotizacionesService(deps: DependenciasCotizaciones): CotizacionesService {
  return {
    async cotizar(entrada) {
      const problemas = deps.revisarSeleccion(entrada);
      if (problemas.length > 0) throw new ErrorSeleccionInvalida(problemas);
      const catalogo = await deps.repositorio.obtenerCatalogo(entrada.categoria);
      return calcularPrecio(catalogo, entrada.seleccion);
    },
  };
}
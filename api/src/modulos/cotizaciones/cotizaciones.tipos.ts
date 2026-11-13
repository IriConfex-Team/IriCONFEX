// HU-18: tipos del cálculo del precio estimado (Anexo B).

/** estimado = hay precio · a_confirmar = falta algún precio en la tabla · incompleto = el cliente aún no elige lo necesario */
export type EstadoCotizacion = 'estimado' | 'a_confirmar' | 'incompleto';

export interface LineaPrecio {
  tipo: 'pieza' | 'adicional';
  /** Código del catálogo: blusa_camisa, short, cuello_camisero... */
  codigo: string;
  /** null = no está en la tabla de precios */
  montoCrc: number | null;
}

export interface Cotizacion {
  estado: EstadoCotizacion;
  /** Suma de las líneas. null si falta algún precio o la selección está incompleta. */
  precioEstimadoCrc: number | null;
  moneda: 'CRC';
  lineas: LineaPrecio[];
}

/** Lo que cada opción del configurador significa en el catálogo (tabla `opcion` de la base). */
export interface EnlaceOpcion {
  tela?: string;
  pieza?: string;
  adicional?: string;
  /** Talla → su columna de precio. Grupo de talla → las columnas de sus tallas, sin repetir. */
  columnas?: string[];
}

export interface Catalogo {
  /** Llave «paso:opcion», por ejemplo «tela-superior:brush» */
  enlaces: Map<string, EnlaceOpcion>;
  /** Llave «pieza|tela|columna» */
  precios: Map<string, number | null>;
  /** Llave «adicional|columna» */
  recargos: Map<string, number | null>;
}

// Filas «planas» con las que se arma el catálogo (las entrega la base, o los CSV en las pruebas)
export interface FilaOpcion {
  paso: string;
  opcion: string;
  tela?: string | null;
  pieza?: string | null;
  adicional?: string | null;
  columnas?: string[];
}
export interface FilaPrecio {
  pieza: string;
  tela: string;
  columna: string;
  montoCrc: number | null;
}
export interface FilaRecargo {
  adicional: string;
  columna: string;
  montoCrc: number | null;
}

export interface EntradaCotizacion {
  categoria: string;
  seleccion: Record<string, string>;
}

export interface CotizacionesRepository {
  /** El catálogo y los precios vigentes de la categoría */
  obtenerCatalogo(categoria: string): Promise<Catalogo>;
}
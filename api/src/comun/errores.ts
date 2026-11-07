export interface DetalleError {
  campo: string;
  mensaje: string;
}

export class ErrorApp extends Error {
  readonly estado: number;
  readonly codigo: string;
  readonly detalles?: DetalleError[];

  constructor(estado: number, codigo: string, mensaje: string, detalles?: DetalleError[]) {
    super(mensaje);
    this.name = 'ErrorApp';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export class ErrorValidacion extends ErrorApp {
  constructor(detalles: DetalleError[]) {
    super(400, 'VALIDACION', 'Los datos enviados no son válidos', detalles);
  }
}

export class ErrorNoEncontrado extends ErrorApp {
  constructor(recurso: string) {
    super(404, 'NO_ENCONTRADO', recurso + ' no existe');
  }
}

export class ErrorSeleccionInvalida extends ErrorApp {
  constructor(detalles: DetalleError[]) {
    super(400, 'SELECCION_INVALIDA', 'La selección no cumple las reglas del catálogo', detalles);
  }
}

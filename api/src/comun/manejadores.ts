import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ErrorApp } from './errores.js';

export const noEncontrado: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      codigo: 'RUTA_NO_ENCONTRADA',
      mensaje: 'La ruta ' + req.method + ' ' + req.path + ' no existe',
    },
  });
};

export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorApp) {
    res.status(err.estado).json({
      error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles },
    });
    return;
  }

  // JSON mal formado en el cuerpo (lo lanza express.json)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la petición no es un JSON válido' },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' },
  });
};
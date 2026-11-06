import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ErrorValidacion, type DetalleError } from './errores.js';

type Esquemas = Partial<Record<'params' | 'query' | 'body', ZodType>>;

export function validar(esquemas: Esquemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const detalles: DetalleError[] = [];
    const entrada: Record<string, unknown> = {};

    for (const parte of ['params', 'query', 'body'] as const) {
      const esquema = esquemas[parte];
      if (!esquema) continue;

      // En Express 5 req.body es undefined si la petición no trae cuerpo
      const valor = parte === 'body' ? (req.body ?? {}) : req[parte];
      const resultado = esquema.safeParse(valor);

      if (resultado.success) {
        entrada[parte] = resultado.data;
      } else {
        for (const problema of resultado.error.issues) {
          detalles.push({
            campo: [parte, ...problema.path.map(String)].join('.'),
            mensaje: problema.message,
          });
        }
      }
    }

    if (detalles.length > 0) {
      next(new ErrorValidacion(detalles));
      return;
    }
    res.locals.entrada = entrada;
    next();
  };
}

// Lee lo que dejó validar(): entrada<{ params: { codigo: string } }>(res)
export function entrada<T>(res: Response): T {
  return res.locals.entrada as T;
}
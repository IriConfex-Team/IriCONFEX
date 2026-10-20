import type { Condicion } from './esquema'

/** Elección por paso: id del paso → id de la opción. */
export type Seleccion = Readonly<Record<string, string>>

/** `null` = todavía no se sabe (depende de un paso sin responder). */
export type Trivalor = boolean | null

/**
 * Indica si un paso sin valor está pendiente (aún se va a responder) y no oculto.
 * Un paso oculto sin valor no cumple ninguna condición; uno pendiente deja la condición en `null`.
 */
export type EsPendiente = (pasoId: string) => boolean

const ninguno: EsPendiente = () => false

export function evaluar(condicion: Condicion, seleccion: Seleccion, pendiente: EsPendiente = ninguno): Trivalor {
  if ('todas' in condicion) {
    const resultados = condicion.todas.map((c) => evaluar(c, seleccion, pendiente))
    if (resultados.includes(false)) return false
    return resultados.includes(null) ? null : true
  }
  if ('alguna' in condicion) {
    const resultados = condicion.alguna.map((c) => evaluar(c, seleccion, pendiente))
    if (resultados.includes(true)) return true
    return resultados.includes(null) ? null : false
  }
  const valor = seleccion[condicion.paso]
  if (valor === undefined) return pendiente(condicion.paso) ? null : false
  return condicion.en.includes(valor)
}

/** Evaluación final: un paso sin valor no cumple. */
export function cumple(condicion: Condicion, seleccion: Seleccion): boolean {
  return evaluar(condicion, seleccion) === true
}

/** Conjunción de varios resultados. */
export function todas(resultados: Trivalor[]): Trivalor {
  if (resultados.includes(false)) return false
  return resultados.includes(null) ? null : true
}

import { cumple, type Seleccion } from './condiciones'
import type { GuiaOpciones, Opcion, ParteDelPaso, Paso } from './esquema'

/** La parte de la prenda a la que se refiere el paso con esta selección (primera variante que aplica). */
export function parteDelPaso(paso: Paso, seleccion: Seleccion): ParteDelPaso | undefined {
  return paso.parte?.find((parte) => !parte.cuando || cumple(parte.cuando, seleccion))
}

export interface FilaGuia {
  opcion: Opcion
  valores: string[]
}

export interface GuiaVisible extends Omit<GuiaOpciones, 'filas' | 'cuando'> {
  filas: FilaGuia[]
}

/**
 * La tabla de referencia del paso (HU-13) con solo las filas de las opciones que se ofrecen ahora.
 * Sin valor si ninguna variante aplica o si no queda ninguna fila.
 */
export function guiaDelPaso(paso: Paso, seleccion: Seleccion, ofrecidas: readonly Opcion[]): GuiaVisible | undefined {
  const guia = paso.guia?.find((g) => !g.cuando || cumple(g.cuando, seleccion))
  if (!guia) return undefined
  const porId = new Map(ofrecidas.map((o) => [o.id, o]))
  const filas = guia.filas.flatMap((fila) => {
    const opcion = porId.get(fila.opcion)
    return opcion ? [{ opcion, valores: fila.valores }] : []
  })
  if (filas.length === 0) return undefined
  const { cuando: _cuando, ...resto } = guia
  return { ...resto, filas }
}

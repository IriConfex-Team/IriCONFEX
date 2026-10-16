import type {
  Condicion,
  ConfiguracionCategoria,
  Opcion,
  Paso,
  ReglaFijacion,
  ReglaVisibilidad,
} from './esquema'

/** Elección por paso: id del paso → id de la opción. */
export type Seleccion = Readonly<Record<string, string>>

export interface Fijacion {
  opcion: string
  /** Presente cuando la fija una regla; ausente cuando es la única opción posible. */
  codigo?: string
  mensaje?: string
}

export interface Conflicto {
  paso: string
  codigo: string
  mensaje?: string
}

export interface EstadoPaso {
  paso: Paso
  /** Opciones que se pueden ofrecer ahora mismo. */
  opciones: Opcion[]
  valor: string | undefined
  fijada: Fijacion | null
  /** Reglas que incumple el valor elegido por una elección posterior (p. ej. R9 al elegir la tela). */
  conflictos: Conflicto[]
}

export interface EstadoFlujo {
  /** Solo los pasos visibles, en orden. */
  pasos: EstadoPaso[]
  conflictos: Conflicto[]
  /** Todos los pasos visibles tienen valor y no hay conflictos. */
  completo: boolean
}

export interface ResultadoEleccion {
  seleccion: Seleccion
  /** Pasos posteriores cuya elección se borró o cambió porque dejó de ser válida (HU-06 CA5). */
  limpiados: string[]
  /** El paso tenía `reiniciaAlCambiar` y se borró todo lo posterior (HU-04 CA3). */
  reiniciado: boolean
}

export type TipoErrorSeleccion =
  | 'paso-desconocido'
  | 'paso-no-aplica'
  | 'falta-eleccion'
  | 'opcion-desconocida'
  | 'opcion-fijada'
  | 'regla-incumplida'

export interface ErrorSeleccion {
  paso: string
  tipo: TipoErrorSeleccion
  codigo?: string
  mensaje: string
}

export class ErrorMotor extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorMotor'
  }
}

/** Decide cómo tratar un paso sin valor dentro de una condición. */
type SiFaltaValor = (pasoId: string) => boolean

interface Indice {
  posicion: Map<string, number>
  pasos: Map<string, Paso>
  visibilidadDelPaso: Map<string, ReglaVisibilidad[]>
  visibilidadDeOpcion: Map<string, ReglaVisibilidad[]>
  fijaciones: Map<string, ReglaFijacion[]>
}

const indices = new WeakMap<ConfiguracionCategoria, Indice>()

function agregar<T>(mapa: Map<string, T[]>, clave: string, valor: T) {
  const lista = mapa.get(clave)
  if (lista) lista.push(valor)
  else mapa.set(clave, [valor])
}

const claveOpcion = (pasoId: string, opcionId: string) => `${pasoId}\u0000${opcionId}`

function indexar(configuracion: ConfiguracionCategoria): Indice {
  const guardado = indices.get(configuracion)
  if (guardado) return guardado
  const indice: Indice = {
    posicion: new Map(configuracion.pasos.map((paso, i) => [paso.id, i])),
    pasos: new Map(configuracion.pasos.map((paso) => [paso.id, paso])),
    visibilidadDelPaso: new Map(),
    visibilidadDeOpcion: new Map(),
    fijaciones: new Map(),
  }
  for (const regla of configuracion.reglas) {
    if (regla.tipo === 'fijacion') {
      agregar(indice.fijaciones, regla.paso, regla)
    } else if (regla.objetivo.opciones) {
      for (const opcion of regla.objetivo.opciones) {
        agregar(indice.visibilidadDeOpcion, claveOpcion(regla.objetivo.paso, opcion), regla)
      }
    } else {
      agregar(indice.visibilidadDelPaso, regla.objetivo.paso, regla)
    }
  }
  indices.set(configuracion, indice)
  return indice
}

function cumple(condicion: Condicion, seleccion: Seleccion, siFalta: SiFaltaValor): boolean {
  if ('todas' in condicion) return condicion.todas.every((c) => cumple(c, seleccion, siFalta))
  if ('alguna' in condicion) return condicion.alguna.some((c) => cumple(c, seleccion, siFalta))
  const valor = seleccion[condicion.paso]
  return valor === undefined ? siFalta(condicion.paso) : condicion.en.includes(valor)
}

/** Un paso sin valor nunca cumple: o está oculto, o aún no se responde. */
const estricto: SiFaltaValor = () => false

/**
 * Para filtrar opciones del paso en la posición `posicion`: un paso anterior sin valor está oculto (no cumple);
 * uno posterior sin valor aún no se responde y no restringe. Así R9 y R10 filtran de la tela hacia el escote y
 * la manga solo cuando la tela ya se eligió (HU-23 CA3).
 */
function haciaAtras(indice: Indice, posicion: number): SiFaltaValor {
  return (pasoId) => (indice.posicion.get(pasoId) ?? -1) > posicion
}

/** Elecciones de los pasos anteriores a `posicion` (sin mirar hacia adelante). */
function anteriores(configuracion: ConfiguracionCategoria, seleccion: Seleccion, posicion: number): Seleccion {
  const resultado: Record<string, string> = {}
  for (let i = 0; i < posicion; i++) {
    const id = configuracion.pasos[i].id
    if (seleccion[id] !== undefined) resultado[id] = seleccion[id]
  }
  return resultado
}

function esVisible(indice: Indice, paso: Paso, seleccion: Seleccion): boolean {
  return (indice.visibilidadDelPaso.get(paso.id) ?? []).every((regla) => cumple(regla.cuando, seleccion, estricto))
}

function reglaDeFijacion(indice: Indice, paso: Paso, seleccion: Seleccion): ReglaFijacion | undefined {
  return (indice.fijaciones.get(paso.id) ?? []).find((regla) => cumple(regla.cuando, seleccion, estricto))
}

function reglasIncumplidas(
  indice: Indice,
  paso: Paso,
  opcionId: string,
  seleccion: Seleccion,
  siFalta: SiFaltaValor,
): ReglaVisibilidad[] {
  return (indice.visibilidadDeOpcion.get(claveOpcion(paso.id, opcionId)) ?? []).filter(
    (regla) => !cumple(regla.cuando, seleccion, siFalta),
  )
}

function opcionesDisponibles(indice: Indice, paso: Paso, seleccion: Seleccion, siFalta: SiFaltaValor): Opcion[] {
  return paso.opciones.filter((opcion) => reglasIncumplidas(indice, paso, opcion.id, seleccion, siFalta).length === 0)
}

/** Fijación por regla, o por ser la única opción que dejan los pasos anteriores. */
function fijacionDelPaso(
  configuracion: ConfiguracionCategoria,
  indice: Indice,
  paso: Paso,
  seleccion: Seleccion,
): Fijacion | null {
  const posicion = indice.posicion.get(paso.id) ?? 0
  const previas = anteriores(configuracion, seleccion, posicion)
  const regla = reglaDeFijacion(indice, paso, previas)
  if (regla) return { opcion: regla.opcion, codigo: regla.codigo, mensaje: regla.mensaje }
  const posibles = opcionesDisponibles(indice, paso, previas, haciaAtras(indice, posicion))
  return posibles.length === 1 ? { opcion: posibles[0].id } : null
}

/**
 * Recorre los pasos posteriores a `desde`: borra elecciones de pasos ocultos o de opciones que ya no aplican,
 * y aplica las fijaciones. Cada paso solo mira a los anteriores, así que una pasada basta.
 */
function normalizar(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  desde: number,
): { seleccion: Seleccion; limpiados: string[] } {
  const indice = indexar(configuracion)
  const actual: Record<string, string> = { ...seleccion }
  const limpiados: string[] = []

  for (let i = desde + 1; i < configuracion.pasos.length; i++) {
    const paso = configuracion.pasos[i]
    const valor = actual[paso.id]
    const previas = anteriores(configuracion, actual, i)

    if (!esVisible(indice, paso, previas)) {
      if (valor !== undefined) {
        delete actual[paso.id]
        limpiados.push(paso.id)
      }
      continue
    }

    const fijada = fijacionDelPaso(configuracion, indice, paso, actual)
    if (fijada) {
      if (valor !== undefined && valor !== fijada.opcion) limpiados.push(paso.id)
      actual[paso.id] = fijada.opcion
      continue
    }

    const posibles = opcionesDisponibles(indice, paso, previas, haciaAtras(indice, i))
    if (valor !== undefined && !posibles.some((opcion) => opcion.id === valor)) {
      delete actual[paso.id]
      limpiados.push(paso.id)
    }
  }

  return { seleccion: actual, limpiados }
}

function buscarPaso(configuracion: ConfiguracionCategoria, pasoId: string): { paso: Paso; posicion: number } {
  const indice = indexar(configuracion)
  const paso = indice.pasos.get(pasoId)
  if (!paso) throw new ErrorMotor(`El paso «${pasoId}» no existe.`)
  return { paso, posicion: indice.posicion.get(pasoId) ?? 0 }
}

/** Selección inicial con las fijaciones que no dependen de nada ya aplicadas. */
export function iniciarSeleccion(configuracion: ConfiguracionCategoria): Seleccion {
  return normalizar(configuracion, {}, -1).seleccion
}

/** Lo que la vista genérica necesita para pintar cualquier paso (HU-23 CA2). */
export function evaluarFlujo(configuracion: ConfiguracionCategoria, seleccion: Seleccion): EstadoFlujo {
  const indice = indexar(configuracion)
  const pasos: EstadoPaso[] = []

  configuracion.pasos.forEach((paso, posicion) => {
    if (!esVisible(indice, paso, seleccion)) return
    const siFalta = haciaAtras(indice, posicion)
    const valor = seleccion[paso.id]
    const conflictos: Conflicto[] =
      valor === undefined
        ? []
        : reglasIncumplidas(indice, paso, valor, seleccion, siFalta).map((regla) => ({
            paso: paso.id,
            codigo: regla.codigo,
            mensaje: regla.mensaje,
          }))
    pasos.push({
      paso,
      opciones: opcionesDisponibles(indice, paso, seleccion, siFalta),
      valor,
      fijada: fijacionDelPaso(configuracion, indice, paso, seleccion),
      conflictos,
    })
  })

  const conflictos = pasos.flatMap((estado) => estado.conflictos)
  const completo = conflictos.length === 0 && pasos.every((estado) => estado.valor !== undefined)
  return { pasos, conflictos, completo }
}

/**
 * Registra una elección y limpia lo posterior que deje de ser válido.
 * Las elecciones anteriores nunca se borran: si una elección posterior las contradice queda como conflicto
 * para que la vista ofrezca cambiarla (HU-06 CA7).
 */
export function elegir(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  pasoId: string,
  opcionId: string,
): ResultadoEleccion {
  const indice = indexar(configuracion)
  const { paso, posicion } = buscarPaso(configuracion, pasoId)

  if (!esVisible(indice, paso, seleccion)) throw new ErrorMotor(`El paso «${pasoId}» no aplica a esta selección.`)
  if (!paso.opciones.some((opcion) => opcion.id === opcionId)) {
    throw new ErrorMotor(`La opción «${opcionId}» no existe en el paso «${pasoId}».`)
  }
  const fijada = fijacionDelPaso(configuracion, indice, paso, seleccion)
  if (fijada && fijada.opcion !== opcionId) throw new ErrorMotor(`El paso «${pasoId}» está fijado.`)
  if (reglasIncumplidas(indice, paso, opcionId, seleccion, haciaAtras(indice, posicion)).length > 0) {
    throw new ErrorMotor(`La opción «${opcionId}» no está disponible en el paso «${pasoId}».`)
  }

  const cambio = seleccion[pasoId] !== opcionId
  const reiniciado = Boolean(paso.reiniciaAlCambiar) && cambio && seleccion[pasoId] !== undefined
  const base: Record<string, string> = reiniciado
    ? { ...anteriores(configuracion, seleccion, posicion) }
    : { ...seleccion }
  base[pasoId] = opcionId

  const { seleccion: nueva, limpiados } = normalizar(configuracion, base, posicion)
  return { seleccion: nueva, limpiados: reiniciado ? [] : limpiados, reiniciado }
}

/**
 * Revalidación completa de una selección terminada (HU-23 CA4). La usa la API antes de aceptar una
 * solicitud: no confía en lo que filtró el navegador.
 */
export function validarSeleccion(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
): { valida: boolean; errores: ErrorSeleccion[] } {
  const indice = indexar(configuracion)
  const errores: ErrorSeleccion[] = []

  for (const pasoId of Object.keys(seleccion)) {
    if (!indice.pasos.has(pasoId)) {
      errores.push({ paso: pasoId, tipo: 'paso-desconocido', mensaje: `El paso «${pasoId}» no existe.` })
    }
  }

  for (const paso of configuracion.pasos) {
    const valor = seleccion[paso.id]
    if (!esVisible(indice, paso, seleccion)) {
      if (valor !== undefined) {
        errores.push({ paso: paso.id, tipo: 'paso-no-aplica', mensaje: `«${paso.nombre}» no aplica a esta selección.` })
      }
      continue
    }
    if (valor === undefined) {
      errores.push({ paso: paso.id, tipo: 'falta-eleccion', mensaje: `Falta elegir «${paso.nombre}».` })
      continue
    }
    const opcion = paso.opciones.find((o) => o.id === valor)
    if (!opcion) {
      errores.push({
        paso: paso.id,
        tipo: 'opcion-desconocida',
        mensaje: `La opción «${valor}» no existe en «${paso.nombre}».`,
      })
      continue
    }
    const fijacion = reglaDeFijacion(indice, paso, seleccion)
    if (fijacion && fijacion.opcion !== valor) {
      errores.push({
        paso: paso.id,
        tipo: 'opcion-fijada',
        codigo: fijacion.codigo,
        mensaje: fijacion.mensaje ?? `«${paso.nombre}» está fijado en otra opción.`,
      })
    }
    for (const regla of reglasIncumplidas(indice, paso, valor, seleccion, estricto)) {
      errores.push({
        paso: paso.id,
        tipo: 'regla-incumplida',
        codigo: regla.codigo,
        mensaje: regla.mensaje ?? `«${opcion.nombre}» no está disponible en «${paso.nombre}» con lo elegido.`,
      })
    }
  }

  return { valida: errores.length === 0, errores }
}

/** Texto del encabezado: la plantilla con la opción elegida, o el nombre de la categoría. */
export function textoEncabezado(configuracion: ConfiguracionCategoria, seleccion: Seleccion): string {
  const { encabezado } = configuracion
  if (!encabezado) return configuracion.categoria.nombre
  const valor = seleccion[encabezado.paso]
  const opcion = indexar(configuracion)
    .pasos.get(encabezado.paso)
    ?.opciones.find((o) => o.id === valor)
  return opcion ? encabezado.plantilla.replace('{opcion}', opcion.nombre) : configuracion.categoria.nombre
}

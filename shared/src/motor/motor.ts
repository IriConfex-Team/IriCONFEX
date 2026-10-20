import { cumple, evaluar, todas, type EsPendiente, type Seleccion, type Trivalor } from './condiciones'
import type {
  ConfiguracionCategoria,
  Opcion,
  Paso,
  ReglaFijacion,
  ReglaVisibilidad,
} from './esquema'

export type { Seleccion }

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

/** Elecciones de los pasos anteriores a `posicion` (sin mirar hacia adelante). */
function anteriores(configuracion: ConfiguracionCategoria, seleccion: Seleccion, posicion: number): Seleccion {
  const resultado: Record<string, string> = {}
  for (let i = 0; i < posicion; i++) {
    const id = configuracion.pasos[i].id
    if (seleccion[id] !== undefined) resultado[id] = seleccion[id]
  }
  return resultado
}

/**
 * Para evaluar el paso en `posicion`: un paso posterior sin valor aún no se responde, igual que uno anterior
 * que todavía está pendiente; ambos dejan la condición en «no se sabe». Así R9 y R10 filtran de la tela hacia
 * el escote y la manga solo cuando la tela ya se eligió (HU-23 CA3), y nada se fija antes de tiempo.
 */
function pendientesDesde(indice: Indice, pendientes: ReadonlySet<string>, posicion: number): EsPendiente {
  return (pasoId) => pendientes.has(pasoId) || (indice.posicion.get(pasoId) ?? -1) > posicion
}

function visibilidad(indice: Indice, paso: Paso, seleccion: Seleccion, pendiente?: EsPendiente): Trivalor {
  return todas((indice.visibilidadDelPaso.get(paso.id) ?? []).map((regla) => evaluar(regla.cuando, seleccion, pendiente)))
}

const esVisible = (indice: Indice, paso: Paso, seleccion: Seleccion) => visibilidad(indice, paso, seleccion) === true

function reglaDeFijacion(indice: Indice, paso: Paso, seleccion: Seleccion): ReglaFijacion | undefined {
  return (indice.fijaciones.get(paso.id) ?? []).find((regla) => cumple(regla.cuando, seleccion))
}

function reglasIncumplidas(
  indice: Indice,
  paso: Paso,
  opcionId: string,
  seleccion: Seleccion,
  pendiente?: EsPendiente,
): ReglaVisibilidad[] {
  return (indice.visibilidadDeOpcion.get(claveOpcion(paso.id, opcionId)) ?? []).filter(
    (regla) => evaluar(regla.cuando, seleccion, pendiente) === false,
  )
}

function disponibilidad(indice: Indice, paso: Paso, opcionId: string, seleccion: Seleccion, pendiente: EsPendiente): Trivalor {
  return todas(
    (indice.visibilidadDeOpcion.get(claveOpcion(paso.id, opcionId)) ?? []).map((regla) =>
      evaluar(regla.cuando, seleccion, pendiente),
    ),
  )
}

/**
 * Fijación por regla, o por ser la única opción que dejan los pasos anteriores. Solo se fija cuando ya es seguro:
 * si algo depende de un paso pendiente, `dudosa` es verdadero y no se fija nada.
 */
function fijacionDelPaso(
  indice: Indice,
  paso: Paso,
  previas: Seleccion,
  pendiente: EsPendiente,
): { fijada: Fijacion | null; dudosa: boolean } {
  for (const regla of indice.fijaciones.get(paso.id) ?? []) {
    const resultado = evaluar(regla.cuando, previas, pendiente)
    if (resultado === null) return { fijada: null, dudosa: true }
    if (resultado) return { fijada: { opcion: regla.opcion, codigo: regla.codigo, mensaje: regla.mensaje }, dudosa: false }
  }
  const resultados = paso.opciones.map((opcion) => disponibilidad(indice, paso, opcion.id, previas, pendiente))
  if (resultados.includes(null)) return { fijada: null, dudosa: true }
  const posibles = paso.opciones.filter((_, i) => resultados[i])
  return { fijada: posibles.length === 1 ? { opcion: posibles[0].id } : null, dudosa: false }
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
  const pendientes = new Set<string>()

  configuracion.pasos.forEach((paso, i) => {
    const pendiente = pendientesDesde(indice, pendientes, i)
    const previas = anteriores(configuracion, actual, i)
    const visible = visibilidad(indice, paso, previas, pendiente)

    if (i <= desde || visible !== true) {
      if (i > desde && visible === false && actual[paso.id] !== undefined) {
        delete actual[paso.id]
        limpiados.push(paso.id)
      }
      if (visible !== false && actual[paso.id] === undefined) pendientes.add(paso.id)
      return
    }

    const valor = actual[paso.id]
    const { fijada, dudosa } = fijacionDelPaso(indice, paso, previas, pendiente)
    if (fijada) {
      if (valor !== undefined && valor !== fijada.opcion) limpiados.push(paso.id)
      actual[paso.id] = fijada.opcion
      return
    }
    if (!dudosa && valor !== undefined && disponibilidad(indice, paso, valor, previas, pendiente) === false) {
      delete actual[paso.id]
      limpiados.push(paso.id)
    }
    if (actual[paso.id] === undefined) pendientes.add(paso.id)
  })

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
  const pendientes = new Set<string>()

  configuracion.pasos.forEach((paso, posicion) => {
    const pendiente = pendientesDesde(indice, pendientes, posicion)
    const valor = seleccion[paso.id]
    const visible = visibilidad(indice, paso, seleccion, pendiente)
    if (visible !== false && valor === undefined) pendientes.add(paso.id)
    if (visible !== true) return

    const conflictos: Conflicto[] =
      valor === undefined
        ? []
        : reglasIncumplidas(indice, paso, valor, seleccion, pendiente).map((regla) => ({
            paso: paso.id,
            codigo: regla.codigo,
            mensaje: regla.mensaje,
          }))
    pasos.push({
      paso,
      opciones: paso.opciones.filter((o) => disponibilidad(indice, paso, o.id, seleccion, pendiente) !== false),
      valor,
      fijada: fijacionDelPaso(indice, paso, anteriores(configuracion, seleccion, posicion), pendiente).fijada,
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
  const { paso, posicion } = buscarPaso(configuracion, pasoId)
  const estado = evaluarFlujo(configuracion, seleccion).pasos.find((e) => e.paso.id === pasoId)

  if (!estado) throw new ErrorMotor(`El paso «${pasoId}» no aplica a esta selección.`)
  if (!paso.opciones.some((opcion) => opcion.id === opcionId)) {
    throw new ErrorMotor(`La opción «${opcionId}» no existe en el paso «${pasoId}».`)
  }
  if (estado.fijada && estado.fijada.opcion !== opcionId) throw new ErrorMotor(`El paso «${pasoId}» está fijado.`)
  if (!estado.opciones.some((opcion) => opcion.id === opcionId)) {
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
    for (const regla of reglasIncumplidas(indice, paso, valor, seleccion)) {
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

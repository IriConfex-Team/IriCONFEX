import type { Seleccion } from './condiciones'
import type { ColorCatalogo, ConfiguracionCategoria } from './esquema'
import { parteDelPaso } from './guias'
import { evaluarFlujo } from './motor'

/** El color de una pieza: uno del catálogo de su tela (id) u otro escrito por la persona. */
export type ColorElegido = { catalogo: string } | { otro: string }

/** Colores elegidos: id del paso de la tela → color. */
export type Colores = Readonly<Record<string, ColorElegido>>

export interface PasoConColor {
  /** Paso de la tela a la que pertenece el color. */
  paso: string
  nombre: string
  /** Tela elegida en ese paso. */
  tela: string
}

export interface GrupoDeColores {
  titulo: string
  colores: ColorCatalogo[]
}

/** Los colores que se piden con esta selección (HU-12a): uno por cada paso de tela visible y respondido. */
export function pasosConColor(configuracion: ConfiguracionCategoria, seleccion: Seleccion): PasoConColor[] {
  const { colores } = configuracion
  if (!colores) return []
  const visibles = new Map(evaluarFlujo(configuracion, seleccion).pasos.map((e) => [e.paso.id, e.valor]))
  return colores.pasos.flatMap(({ paso, nombre }) => {
    const tela = visibles.get(paso)
    return tela === undefined ? [] : [{ paso, nombre, tela }]
  })
}

/** El catálogo de la tela, agrupado (lisos, estampados…). Vacío si la tela no tiene colores: solo «otro». */
export function coloresDeLaTela(configuracion: ConfiguracionCategoria, tela: string): GrupoDeColores[] {
  return configuracion.colores?.porTela[tela]?.grupos ?? []
}

function buscarColor(configuracion: ConfiguracionCategoria, tela: string, id: string): ColorCatalogo | undefined {
  return coloresDeLaTela(configuracion, tela)
    .flatMap((g) => g.colores)
    .find((c) => c.id === id)
}

/** «Rosado Claro (C1)», «Flores (estampado)» u «Otro color: vino». */
export function nombreDelColor(configuracion: ConfiguracionCategoria, tela: string, elegido: ColorElegido): string {
  if ('otro' in elegido) return `${configuracion.colores?.otro.nombre ?? 'Otro'}: ${elegido.otro.trim()}`
  const color = buscarColor(configuracion, tela, elegido.catalogo)
  if (!color) return elegido.catalogo
  if (!color.tono) return `${color.nombre} (estampado)`
  return color.codigo ? `${color.nombre} (${color.codigo})` : color.nombre
}

/** El tono del color elegido, para pintar la prenda; sin valor si es un estampado u otro color. */
export function tonoDelColor(configuracion: ConfiguracionCategoria, tela: string, elegido: ColorElegido | undefined): string | undefined {
  return elegido && 'catalogo' in elegido ? buscarColor(configuracion, tela, elegido.catalogo)?.tono : undefined
}

/**
 * El tono de cada pieza dibujada según el color de su tela (HU-12b): las piezas son las de la `parte`
 * del paso de la tela. Las piezas sin color elegido (o con estampado u otro color) no aparecen.
 */
export function tonosPorPieza(configuracion: ConfiguracionCategoria, seleccion: Seleccion, colores: Colores): Record<string, string> {
  const tonos: Record<string, string> = {}
  for (const { paso, tela } of pasosConColor(configuracion, seleccion)) {
    const tono = tonoDelColor(configuracion, tela, colores[paso])
    const definicion = configuracion.pasos.find((p) => p.id === paso)
    const parte = definicion && parteDelPaso(definicion, seleccion)
    if (tono && parte) for (const pieza of parte.piezas) tonos[pieza] = tono
  }
  return tonos
}

function esValido(configuracion: ConfiguracionCategoria, tela: string, elegido: ColorElegido): boolean {
  if ('otro' in elegido) {
    const texto = elegido.otro.trim()
    return texto.length > 0 && texto.length <= (configuracion.colores?.otro.maximo ?? 0)
  }
  return buscarColor(configuracion, tela, elegido.catalogo) !== undefined
}

/**
 * Deja solo los colores que siguen valiendo con esta selección: si se cambió la tela, el color del catálogo
 * anterior se borra (el «otro» se conserva); si el paso de la tela ya no aplica, también se borra.
 */
export function coloresVigentes(configuracion: ConfiguracionCategoria, seleccion: Seleccion, colores: Colores): Record<string, ColorElegido> {
  const vigentes: Record<string, ColorElegido> = {}
  for (const { paso, tela } of pasosConColor(configuracion, seleccion)) {
    const elegido = colores[paso]
    if (!elegido) continue
    if ('otro' in elegido || buscarColor(configuracion, tela, elegido.catalogo)) vigentes[paso] = elegido
  }
  return vigentes
}

export type TipoErrorColor = 'falta' | 'invalido' | 'no-aplica'

export interface ErrorColor {
  paso: string
  tipo: TipoErrorColor
  mensaje: string
}

/** Revalidación en el servidor (HU-12a): un color válido por cada tela que lo pide, y nada más. */
export function validarColores(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  colores: Colores | undefined,
): { valido: boolean; errores: ErrorColor[] } {
  const piden = pasosConColor(configuracion, seleccion)
  const ids = new Set(piden.map((p) => p.paso))
  const errores: ErrorColor[] = []
  for (const paso of Object.keys(colores ?? {})) {
    if (!ids.has(paso)) errores.push({ paso, tipo: 'no-aplica', mensaje: `El color de «${paso}» no aplica a esta selección.` })
  }
  for (const { paso, nombre, tela } of piden) {
    const elegido = colores?.[paso]
    if (!elegido) errores.push({ paso, tipo: 'falta', mensaje: `Falta elegir «${nombre}».` })
    else if (!esValido(configuracion, tela, elegido)) errores.push({ paso, tipo: 'invalido', mensaje: `«${nombre}» no es válido para esa tela.` })
  }
  return { valido: errores.length === 0, errores }
}

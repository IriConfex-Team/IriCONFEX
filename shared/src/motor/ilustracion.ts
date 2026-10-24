import { cumple, type Seleccion } from './condiciones'
import type { ConfiguracionCategoria, ConfiguracionIlustracion } from './esquema'
import { elegir, ErrorMotor } from './motor'

export interface PiezaIlustrada {
  id: string
  ancho: number
  alto: number
  desplazamiento: number
  /** URLs de las capas en orden de dibujo. */
  archivos: string[]
}

export interface Ilustracion {
  ancho: number
  alto: number
  piezas: PiezaIlustrada[]
}

const marcador = /\{([^}]+)\}/g

/** Reemplaza `{x}` por la variable o la elección del paso `x`; `null` si alguna no tiene valor. */
function resolver(
  ilustracion: ConfiguracionIlustracion,
  plantilla: string,
  seleccion: Seleccion,
  enCurso: ReadonlySet<string> = new Set(),
): string | null {
  let completa = true
  const texto = plantilla.replace(marcador, (_, nombre: string) => {
    const valor = valorDe(ilustracion, nombre, seleccion, enCurso)
    if (valor === null) completa = false
    return valor ?? ''
  })
  return completa ? texto : null
}

function valorDe(
  ilustracion: ConfiguracionIlustracion,
  nombre: string,
  seleccion: Seleccion,
  enCurso: ReadonlySet<string>,
): string | null {
  const entradas = ilustracion.variables?.[nombre]
  if (!entradas) return seleccion[nombre] ?? null
  if (enCurso.has(nombre)) return null
  const siguiente = new Set(enCurso).add(nombre)
  for (const entrada of entradas) {
    if (entrada.cuando && !cumple(entrada.cuando, seleccion)) continue
    const valor = resolver(ilustracion, entrada.valor, seleccion, siguiente)
    if (valor !== null) return valor
  }
  return null
}

/** Completa con el relleno lo que aún no se eligió, solo para poder dibujar. */
function conRelleno(ilustracion: ConfiguracionIlustracion, seleccion: Seleccion): Seleccion {
  const resultado: Record<string, string> = { ...seleccion }
  for (const relleno of ilustracion.relleno ?? []) {
    if (resultado[relleno.paso] !== undefined) continue
    if (relleno.cuando && !cumple(relleno.cuando, resultado)) continue
    resultado[relleno.paso] = relleno.opcion
  }
  return resultado
}

/** Capas que dibujan la selección. `null` si la configuración no tiene ilustración o nada aplica todavía. */
export function ilustrar(configuracion: ConfiguracionCategoria, seleccion: Seleccion): Ilustracion | null {
  const { ilustracion } = configuracion
  if (!ilustracion) return null
  const vista = conRelleno(ilustracion, seleccion)
  const carpeta = ilustracion.carpeta.replace(/\/+$/, '')

  const piezas: PiezaIlustrada[] = []
  for (const pieza of ilustracion.piezas) {
    if (pieza.cuando && !cumple(pieza.cuando, vista)) continue
    const archivos = pieza.capas.flatMap((capa) => {
      if (capa.cuando && !cumple(capa.cuando, vista)) return []
      const ruta = resolver(ilustracion, capa.archivo, vista)
      return ruta === null ? [] : [`${carpeta}/${ruta}`]
    })
    if (archivos.length > 0) {
      piezas.push({ id: pieza.id, ancho: pieza.ancho, alto: pieza.alto, desplazamiento: pieza.desplazamiento ?? 0, archivos })
    }
  }
  if (piezas.length === 0) return null

  return {
    ancho: Math.max(...piezas.map((p) => p.ancho)),
    alto: Math.max(...piezas.map((p) => p.desplazamiento + p.alto)),
    piezas,
  }
}

/** Cómo se vería la prenda si se eligiera `opcionId` (con la misma limpieza que haría `elegir`). */
export function ilustrarOpcion(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  pasoId: string,
  opcionId: string,
): Ilustracion | null {
  try {
    return ilustrar(configuracion, elegir(configuracion, seleccion, pasoId, opcionId).seleccion)
  } catch (error) {
    if (error instanceof ErrorMotor) return null
    throw error
  }
}

/** Dos ilustraciones dibujan exactamente lo mismo. */
export function mismaIlustracion(a: Ilustracion | null, b: Ilustracion | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

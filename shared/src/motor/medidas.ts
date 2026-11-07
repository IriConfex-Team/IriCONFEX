import { cumple, type Seleccion } from './condiciones'
import type { CampoMedidas, ConfiguracionCategoria } from './esquema'

/** Medidas propias: id del campo → valor en la unidad de la configuración. */
export type Medidas = Readonly<Record<string, number>>

export interface GrupoMedidas {
  titulo: string
  campos: CampoMedidas[]
}

/** La pantalla de medidas aplica a esta selección (HU-14 CA1). */
export function pideMedidas(configuracion: ConfiguracionCategoria, seleccion: Seleccion): boolean {
  return configuracion.medidas !== undefined && cumple(configuracion.medidas.cuando, seleccion)
}

/**
 * Los campos que se piden con esta selección, agrupados (HU-14 CA3): un grupo o un campo con `cuando`
 * solo aparece si se cumple. Lista vacía si la pantalla no aplica.
 */
export function camposQueAplican(configuracion: ConfiguracionCategoria, seleccion: Seleccion): GrupoMedidas[] {
  if (!pideMedidas(configuracion, seleccion)) return []
  return (configuracion.medidas?.grupos ?? [])
    .filter((grupo) => !grupo.cuando || cumple(grupo.cuando, seleccion))
    .map((grupo) => ({
      titulo: grupo.titulo,
      campos: grupo.campos.filter((campo) => !campo.cuando || cumple(campo.cuando, seleccion)),
    }))
    .filter((grupo) => grupo.campos.length > 0)
}

/** Ruta de la guía visual del campo con las elecciones de la selección; sin valor si falta alguna. */
export function imagenDelCampo(campo: CampoMedidas, seleccion: Seleccion): string | undefined {
  if (!campo.imagen) return undefined
  let faltante = false
  const ruta = campo.imagen.replace(/\{([^}]+)\}/g, (_, paso: string) => {
    const valor = seleccion[paso]
    if (valor === undefined) faltante = true
    return valor ?? ''
  })
  return faltante ? undefined : ruta
}

/** Lee lo que escribió la persona: acepta coma o punto decimal y espacios. */
export function leerNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpio)) return undefined
  return Number(limpio)
}

/** «85.5» → «85,5» (como se escribe en Costa Rica). */
export function formatoNumero(valor: number): string {
  return String(valor).replace('.', ',')
}

export type TipoErrorMedidas = 'falta' | 'invalida' | 'fuera-de-rango' | 'no-aplica'

export interface ErrorMedidas {
  campo: string
  tipo: TipoErrorMedidas
  mensaje: string
}

function errorDeRango(campo: CampoMedidas, unidad: string): string {
  return `Escribe un número entre ${formatoNumero(campo.min)} y ${formatoNumero(campo.max)} ${unidad}.`
}

/**
 * Valida lo escrito en la pantalla (HU-14 CA5): campos vacíos, números mal escritos y fuera de rango.
 * Devuelve un mensaje por campo y las medidas ya convertidas a número.
 */
export function revisarMedidasEscritas(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  escritas: Readonly<Record<string, string>>,
): { medidas: Record<string, number>; errores: Record<string, string> } {
  const unidad = configuracion.medidas?.unidad ?? ''
  const medidas: Record<string, number> = {}
  const errores: Record<string, string> = {}
  for (const campo of camposQueAplican(configuracion, seleccion).flatMap((g) => g.campos)) {
    const texto = escritas[campo.id] ?? ''
    if (texto.trim() === '') {
      errores[campo.id] = 'Completa este campo.'
      continue
    }
    const valor = leerNumero(texto)
    if (valor === undefined || valor < campo.min || valor > campo.max) errores[campo.id] = errorDeRango(campo, unidad)
    else medidas[campo.id] = valor
  }
  return { medidas, errores }
}

/** Revalidación en el servidor (HU-14 CA5–CA6): exactamente los campos que aplican, dentro de su rango. */
export function validarMedidas(
  configuracion: ConfiguracionCategoria,
  seleccion: Seleccion,
  medidas: Medidas | undefined,
): { valida: boolean; errores: ErrorMedidas[] } {
  const unidad = configuracion.medidas?.unidad ?? ''
  const campos = camposQueAplican(configuracion, seleccion).flatMap((g) => g.campos)
  const ids = new Set(campos.map((c) => c.id))
  const errores: ErrorMedidas[] = []

  for (const id of Object.keys(medidas ?? {})) {
    if (!ids.has(id)) errores.push({ campo: id, tipo: 'no-aplica', mensaje: `El campo «${id}» no aplica a esta selección.` })
  }
  for (const campo of campos) {
    const valor = medidas?.[campo.id]
    if (valor === undefined) errores.push({ campo: campo.id, tipo: 'falta', mensaje: `Falta «${campo.nombre}».` })
    else if (!Number.isFinite(valor)) errores.push({ campo: campo.id, tipo: 'invalida', mensaje: `«${campo.nombre}» no es un número.` })
    else if (valor < campo.min || valor > campo.max) {
      errores.push({ campo: campo.id, tipo: 'fuera-de-rango', mensaje: `«${campo.nombre}»: ${errorDeRango(campo, unidad)}` })
    }
  }
  return { valida: errores.length === 0, errores }
}

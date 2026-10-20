import { z } from 'zod'

/**
 * Estructuras de la configuración de una categoría (HU-23 CA1).
 * El motor no conoce ninguna prenda: pasos, opciones y reglas llegan como datos (Anexo A, cargados por HU-24a).
 */

/** Condición sobre elecciones previas: valores permitidos de un paso, o combinación «todas» / «alguna». */
export type Condicion = { paso: string; en: string[] } | { todas: Condicion[] } | { alguna: Condicion[] }

const esquemaCondicion: z.ZodType<Condicion> = z.lazy(() =>
  z.union([
    z.strictObject({ paso: z.string().min(1), en: z.array(z.string().min(1)).min(1) }),
    z.strictObject({ todas: z.array(esquemaCondicion).min(1) }),
    z.strictObject({ alguna: z.array(esquemaCondicion).min(1) }),
  ]),
)

const esquemaOpcion = z.strictObject({
  id: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  /** Ruta o URL de la fotografía de referencia (HU-06 CA4). */
  imagen: z.string().optional(),
})

const esquemaPaso = z.strictObject({
  id: z.string().min(1),
  nombre: z.string().min(1),
  /** Cómo se presenta: tarjetas de opción o selector sí / no (opciones con id «si» y «no»). */
  presentacion: z.enum(['tarjetas', 'si-no']),
  /** Texto fijo que se informa sin preguntar (p. ej. detalles que no se eligen). */
  nota: z.string().optional(),
  /** Al cambiar este paso se borran todas las elecciones posteriores (HU-04 CA3). */
  reiniciaAlCambiar: z.boolean().optional(),
  opciones: z.array(esquemaOpcion).min(1),
})

/**
 * Tipo 1 · Visibilidad por valores permitidos (HU-23 CA3).
 * Sin `opciones`: el paso solo aparece si se cumple `cuando`. Con `opciones`: esas opciones solo se ofrecen si se cumple.
 */
const esquemaReglaVisibilidad = z.strictObject({
  tipo: z.literal('visibilidad'),
  /** Referencia al Anexo A (R1…R10, A8.x). No necesita ser única. */
  codigo: z.string().min(1),
  objetivo: z.strictObject({
    paso: z.string().min(1),
    opciones: z.array(z.string().min(1)).min(1).optional(),
  }),
  cuando: esquemaCondicion,
  /** Explicación en una línea cuando la regla deja una elección en conflicto. */
  mensaje: z.string().optional(),
})

/** Tipo 2 · Fijación automática de una opción (HU-23 CA3), con mensaje de una línea (HU-06 CA3). */
const esquemaReglaFijacion = z.strictObject({
  tipo: z.literal('fijacion'),
  codigo: z.string().min(1),
  paso: z.string().min(1),
  opcion: z.string().min(1),
  cuando: esquemaCondicion,
  mensaje: z.string().optional(),
})

const esquemaRegla = z.discriminatedUnion('tipo', [esquemaReglaVisibilidad, esquemaReglaFijacion])

export const esquemaConfiguracion = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  categoria: z.strictObject({ id: z.string().min(1), nombre: z.string().min(1) }),
  /** Texto del encabezado según la opción elegida en un paso, p. ej. «… para {opcion}». */
  encabezado: z.strictObject({ paso: z.string().min(1), plantilla: z.string().min(1) }).optional(),
  pasos: z.array(esquemaPaso).min(1),
  reglas: z.array(esquemaRegla),
})

export type Opcion = z.infer<typeof esquemaOpcion>
export type Paso = z.infer<typeof esquemaPaso>
export type ReglaVisibilidad = z.infer<typeof esquemaReglaVisibilidad>
export type ReglaFijacion = z.infer<typeof esquemaReglaFijacion>
export type Regla = z.infer<typeof esquemaRegla>
export type ConfiguracionCategoria = z.infer<typeof esquemaConfiguracion>

export class ErrorConfiguracion extends Error {
  readonly problemas: string[]

  constructor(problemas: string[]) {
    super(`Configuración inválida:\n- ${problemas.join('\n- ')}`)
    this.name = 'ErrorConfiguracion'
    this.problemas = problemas
  }
}

/** Valida la forma y que toda referencia (pasos, opciones) exista. Úsese al cargar datos del servidor o de archivo. */
export function cargarConfiguracion(datos: unknown): ConfiguracionCategoria {
  const resultado = esquemaConfiguracion.safeParse(datos)
  if (!resultado.success) {
    throw new ErrorConfiguracion(
      resultado.error.issues.map((problema) => `${problema.path.join('.') || '(raíz)'}: ${problema.message}`),
    )
  }
  const configuracion = resultado.data
  const problemas = verificarReferencias(configuracion)
  if (problemas.length > 0) throw new ErrorConfiguracion(problemas)
  return configuracion
}

function verificarReferencias(configuracion: ConfiguracionCategoria): string[] {
  const problemas: string[] = []
  const opcionesPorPaso = new Map<string, Set<string>>()

  for (const paso of configuracion.pasos) {
    if (opcionesPorPaso.has(paso.id)) problemas.push(`paso repetido «${paso.id}»`)
    const ids = new Set<string>()
    for (const opcion of paso.opciones) {
      if (ids.has(opcion.id)) problemas.push(`opción repetida «${opcion.id}» en el paso «${paso.id}»`)
      ids.add(opcion.id)
    }
    if (paso.presentacion === 'si-no' && (ids.size !== 2 || !ids.has('si') || !ids.has('no'))) {
      problemas.push(`el paso «${paso.id}» es sí / no y debe tener exactamente las opciones «si» y «no»`)
    }
    opcionesPorPaso.set(paso.id, ids)
  }

  const revisarOpciones = (donde: string, pasoId: string, opciones: readonly string[]) => {
    const ids = opcionesPorPaso.get(pasoId)
    if (!ids) {
      problemas.push(`${donde}: el paso «${pasoId}» no existe`)
      return
    }
    for (const opcion of opciones) {
      if (!ids.has(opcion)) problemas.push(`${donde}: la opción «${opcion}» no existe en el paso «${pasoId}»`)
    }
  }

  const revisarCondicion = (donde: string, condicion: Condicion) => {
    if ('todas' in condicion) condicion.todas.forEach((c) => revisarCondicion(donde, c))
    else if ('alguna' in condicion) condicion.alguna.forEach((c) => revisarCondicion(donde, c))
    else revisarOpciones(donde, condicion.paso, condicion.en)
  }

  configuracion.reglas.forEach((regla, i) => {
    const donde = `regla ${i} (${regla.codigo})`
    if (regla.tipo === 'visibilidad') revisarOpciones(donde, regla.objetivo.paso, regla.objetivo.opciones ?? [])
    else revisarOpciones(donde, regla.paso, [regla.opcion])
    revisarCondicion(donde, regla.cuando)
  })

  if (configuracion.encabezado) revisarOpciones('encabezado', configuracion.encabezado.paso, [])

  return problemas
}

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
  /** Aviso corto que acompaña a la opción (p. ej. una condición de confección). */
  etiqueta: z.string().optional(),
  /** Ruta o URL de la fotografía de referencia (HU-06 CA4). */
  imagen: z.string().optional(),
  /** Al elegirla se muestra la información del local (HU-15, HU-16). */
  muestraInfoLocal: z.boolean().optional(),
})

/**
 * A qué parte de la prenda se refiere el paso (p. ej. la talla de arriba y luego la de abajo).
 * Se usa la primera variante cuya condición se cumple; `piezas` son ids de `ilustracion.piezas` que se resaltan.
 */
const esquemaParte = z.strictObject({
  nombre: z.string().min(1),
  texto: z.string().optional(),
  piezas: z.array(z.string().min(1)).min(1),
  cuando: esquemaCondicion.optional(),
})

/** Tabla de referencia para elegir entre las opciones del paso (HU-13), con imagen de dónde medir. */
const esquemaGuiaOpciones = z.strictObject({
  cuando: esquemaCondicion.optional(),
  titulo: z.string().min(1),
  imagen: z.string().optional(),
  /** Qué medir, en el orden en que aparecen en la imagen (de arriba abajo). */
  medidas: z.array(z.strictObject({ nombre: z.string().min(1), como: z.string().min(1) })).optional(),
  columnas: z.array(z.string().min(1)).min(1),
  /** Una fila por opción del paso; solo se muestran las que se ofrecen en ese momento. */
  filas: z.array(z.strictObject({ opcion: z.string().min(1), valores: z.array(z.string()) })).min(1),
  nota: z.string().optional(),
})

const esquemaPaso = z.strictObject({
  id: z.string().min(1),
  nombre: z.string().min(1),
  /**
   * Cómo se presenta: tarjetas en rejilla, lista con foto y descripción, o selector sí / no
   * (opciones con id «si» y «no»).
   */
  presentacion: z.enum(['tarjetas', 'lista', 'si-no']),
  /** Texto fijo que se informa sin preguntar (p. ej. detalles que no se eligen). */
  nota: z.string().optional(),
  /** Al cambiar este paso se borran todas las elecciones posteriores (HU-04 CA3). */
  reiniciaAlCambiar: z.boolean().optional(),
  parte: z.array(esquemaParte).min(1).optional(),
  guia: z.array(esquemaGuiaOpciones).min(1).optional(),
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

/**
 * Ilustración por capas (HU-06 CA4). Las rutas son plantillas: `{x}` se reemplaza por la variable `x`
 * o por la opción elegida en el paso `x`; si algo no tiene valor, la capa no se dibuja.
 */
const esquemaIlustracion = z.strictObject({
  /** Carpeta pública de los SVG, p. ej. «/ilustraciones». */
  carpeta: z.string().min(1),
  /** Elecciones supuestas solo para dibujar mientras el paso no se ha respondido. */
  relleno: z.array(z.strictObject({ paso: z.string().min(1), opcion: z.string().min(1), cuando: esquemaCondicion.optional() })).optional(),
  /** Valores derivados: se usa la primera entrada cuya condición se cumple y cuyas plantillas tienen valor. */
  variables: z
    .record(z.string().min(1), z.array(z.strictObject({ valor: z.string(), cuando: esquemaCondicion.optional() })).min(1))
    .optional(),
  /** Piezas en orden de dibujo (la de abajo primero). Cada una tiene su propio lienzo y su propia silueta. */
  piezas: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        ancho: z.number().positive(),
        alto: z.number().positive(),
        /** Cuánto baja la pieza dentro del conjunto. */
        desplazamiento: z.number().min(0).optional(),
        cuando: esquemaCondicion.optional(),
        capas: z.array(z.strictObject({ archivo: z.string().min(1), cuando: esquemaCondicion.optional() })).min(1),
      }),
    )
    .min(1),
})

/** Datos del negocio (HU-03). El teléfono son 8 dígitos de Costa Rica. */
const esquemaNegocio = z.strictObject({
  nombre: z.string().min(1),
  direccion: z.string().min(1),
  senas: z.string().optional(),
  /** Enlace de mapas; si falta, se busca la dirección. */
  mapa: z.string().optional(),
  horario: z.array(z.strictObject({ dias: z.string().min(1), horas: z.string().min(1) })).min(1),
  whatsapp: z.string().regex(/^[245678]\d{7}$/, 'debe tener 8 dígitos de Costa Rica'),
  /** Datos que la clienta aún no confirma (solo para el equipo). */
  pendientes: z.array(z.string()).optional(),
})

/** Agrupación de los pasos en el resumen y en el mensaje (HU-21, HU-22). Un paso sin sección va al final. */
const esquemaResumen = z.strictObject({
  secciones: z.array(z.strictObject({ titulo: z.string().min(1), pasos: z.array(z.string().min(1)).min(1) })).min(1),
})

/** Un campo de medidas propias (HU-14 CA3–CA5). */
const esquemaCampoMedidas = z
  .strictObject({
    id: z.string().min(1),
    nombre: z.string().min(1),
    /** Cómo tomarla, en palabras de la clienta (HU-14 CA4). */
    como: z.string().min(1),
    /** Rango aceptado, en la unidad de la sección (HU-14 CA5). */
    min: z.number().positive(),
    max: z.number().positive(),
    /** Guía visual. Plantilla: `{x}` se reemplaza por la opción elegida en el paso `x`. */
    imagen: z.string().optional(),
    cuando: esquemaCondicion.optional(),
  })
  .refine((campo) => campo.min < campo.max, { message: 'min debe ser menor que max' })

/** Pantalla de medidas propias (HU-14): aparece antes del paso `antesDe` cuando se cumple `cuando`. */
const esquemaMedidas = z.strictObject({
  cuando: esquemaCondicion,
  antesDe: z.string().min(1),
  titulo: z.string().min(1),
  unidad: z.string().min(1),
  /** Consejos generales que se muestran arriba de los campos. */
  indicaciones: z.array(z.string().min(1)).optional(),
  grupos: z
    .array(
      z.strictObject({
        titulo: z.string().min(1),
        cuando: esquemaCondicion.optional(),
        campos: z.array(esquemaCampoMedidas).min(1),
      }),
    )
    .min(1),
})

export const esquemaConfiguracion = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  categoria: z.strictObject({
    id: z.string().min(1),
    nombre: z.string().min(1),
    /** Cómo se presenta en la lista de categorías (HU-01). */
    tarjeta: z
      .strictObject({
        titulo: z.string().min(1),
        descripcion: z.string().optional(),
        /** Fotografía representativa; mientras no exista se usa `dibujo`. */
        imagen: z.string().optional(),
        /** La prenda dibujada con estas elecciones (y este color de tela) como imagen de la categoría. */
        dibujo: z
          .strictObject({ seleccion: z.record(z.string(), z.string()), color: z.string().optional() })
          .optional(),
      })
      .optional(),
  }),
  /** Texto del encabezado según la opción elegida en un paso, p. ej. «… para {opcion}». */
  encabezado: z.strictObject({ paso: z.string().min(1), plantilla: z.string().min(1) }).optional(),
  pasos: z.array(esquemaPaso).min(1),
  reglas: z.array(esquemaRegla),
  ilustracion: esquemaIlustracion.optional(),
  negocio: esquemaNegocio.optional(),
  resumen: esquemaResumen.optional(),
  medidas: esquemaMedidas.optional(),
})

export type Opcion = z.infer<typeof esquemaOpcion>
export type Paso = z.infer<typeof esquemaPaso>
export type ParteDelPaso = z.infer<typeof esquemaParte>
export type GuiaOpciones = z.infer<typeof esquemaGuiaOpciones>
export type ReglaVisibilidad = z.infer<typeof esquemaReglaVisibilidad>
export type ReglaFijacion = z.infer<typeof esquemaReglaFijacion>
export type Regla = z.infer<typeof esquemaRegla>
export type ConfiguracionCategoria = z.infer<typeof esquemaConfiguracion>
export type ConfiguracionIlustracion = z.infer<typeof esquemaIlustracion>
export type Negocio = z.infer<typeof esquemaNegocio>
export type ConfiguracionResumen = z.infer<typeof esquemaResumen>
export type ConfiguracionMedidas = z.infer<typeof esquemaMedidas>
export type CampoMedidas = z.infer<typeof esquemaCampoMedidas>

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

  const piezas = new Set(configuracion.ilustracion?.piezas.map((p) => p.id) ?? [])
  for (const paso of configuracion.pasos) {
    paso.parte?.forEach((parte, i) => {
      const donde = `paso «${paso.id}», parte ${i}`
      if (parte.cuando) revisarCondicion(donde, parte.cuando)
      for (const pieza of parte.piezas) {
        if (!piezas.has(pieza)) problemas.push(`${donde}: la pieza «${pieza}» no está en la ilustración`)
      }
    })
    paso.guia?.forEach((guia, i) => {
      const donde = `paso «${paso.id}», guía ${i}`
      if (guia.cuando) revisarCondicion(donde, guia.cuando)
      revisarOpciones(donde, paso.id, guia.filas.map((f) => f.opcion))
      for (const fila of guia.filas) {
        if (fila.valores.length !== guia.columnas.length) {
          problemas.push(`${donde}: la fila «${fila.opcion}» tiene ${fila.valores.length} valores y hay ${guia.columnas.length} columnas`)
        }
      }
    })
  }

  for (const [paso, opcion] of Object.entries(configuracion.categoria.tarjeta?.dibujo?.seleccion ?? {})) {
    revisarOpciones('categoría, dibujo de la tarjeta', paso, [opcion])
  }

  if (configuracion.encabezado) revisarOpciones('encabezado', configuracion.encabezado.paso, [])
  configuracion.resumen?.secciones.forEach((seccion) =>
    seccion.pasos.forEach((paso) => revisarOpciones(`resumen, sección «${seccion.titulo}»`, paso, [])),
  )

  const { ilustracion } = configuracion
  if (ilustracion) {
    const variables = new Set(Object.keys(ilustracion.variables ?? {}))
    const revisarPlantilla = (donde: string, plantilla: string) => {
      for (const [, nombre] of plantilla.matchAll(/\{([^}]+)\}/g)) {
        if (!variables.has(nombre) && !opcionesPorPaso.has(nombre)) {
          problemas.push(`${donde}: «{${nombre}}» no es una variable ni un paso`)
        }
      }
    }
    ilustracion.relleno?.forEach((relleno, i) => {
      revisarOpciones(`ilustración, relleno ${i}`, relleno.paso, [relleno.opcion])
      if (relleno.cuando) revisarCondicion(`ilustración, relleno ${i}`, relleno.cuando)
    })
    for (const [nombre, entradas] of Object.entries(ilustracion.variables ?? {})) {
      entradas.forEach((entrada, i) => {
        const donde = `ilustración, variable ${nombre}[${i}]`
        revisarPlantilla(donde, entrada.valor)
        if (entrada.cuando) revisarCondicion(donde, entrada.cuando)
      })
    }
    for (const pieza of ilustracion.piezas) {
      if (pieza.cuando) revisarCondicion(`ilustración, pieza ${pieza.id}`, pieza.cuando)
      pieza.capas.forEach((capa, i) => {
        const donde = `ilustración, pieza ${pieza.id}, capa ${i}`
        revisarPlantilla(donde, capa.archivo)
        if (capa.cuando) revisarCondicion(donde, capa.cuando)
      })
    }
  }

  const { medidas } = configuracion
  if (medidas) {
    revisarCondicion('medidas', medidas.cuando)
    revisarOpciones('medidas, antesDe', medidas.antesDe, [])
    const ids = new Set<string>()
    for (const grupo of medidas.grupos) {
      if (grupo.cuando) revisarCondicion(`medidas, grupo «${grupo.titulo}»`, grupo.cuando)
      for (const campo of grupo.campos) {
        const donde = `medidas, campo «${campo.id}»`
        if (ids.has(campo.id)) problemas.push(`${donde}: repetido`)
        ids.add(campo.id)
        if (campo.cuando) revisarCondicion(donde, campo.cuando)
        for (const [, paso] of campo.imagen?.matchAll(/\{([^}]+)\}/g) ?? []) {
          if (!opcionesPorPaso.has(paso)) problemas.push(`${donde}: «{${paso}}» no es un paso`)
        }
      }
    }
  }

  return problemas
}

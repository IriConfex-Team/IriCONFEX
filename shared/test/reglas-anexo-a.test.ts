import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cargarConfiguracion, elegir, evaluarFlujo, iniciarSeleccion, validarSeleccion, type Seleccion } from '../src'

// Una prueba por regla del Anexo A (HU-23 CA5, RNF-12), contra los datos reales que carga HU-24a.
const configuracion = cargarConfiguracion(
  JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8')),
)

/** Aplica elecciones en orden, como lo haría la vista. */
function recorrer(...elecciones: [string, string][]): Seleccion {
  return elecciones.reduce<Seleccion>(
    (seleccion, [paso, opcion]) => elegir(configuracion, seleccion, paso, opcion).seleccion,
    iniciarSeleccion(configuracion),
  )
}

const estadoDe = (seleccion: Seleccion, paso: string) =>
  evaluarFlujo(configuracion, seleccion).pasos.find((e) => e.paso.id === paso)
const opciones = (seleccion: Seleccion, paso: string) => estadoDe(seleccion, paso)?.opciones.map((o) => o.id)
const visible = (seleccion: Seleccion, paso: string) => estadoDe(seleccion, paso) !== undefined

const mujerBlusa: [string, string][] = [
  ['perfil', 'mujer'],
  ['base', 'dos-piezas'],
]

describe('nada se elige solo antes de tiempo', () => {
  it('al iniciar solo se fija lo que no depende de nada (la entrega, que tiene una sola opción)', () => {
    expect(iniciarSeleccion(configuracion)).toEqual({ entrega: 'retiro' })
  })

  it('tras elegir perfil y base, el escote y los acabados siguen sin elegir', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'])
    expect(s).toEqual({ perfil: 'mujer', base: 'dos-piezas', entrega: 'retiro' })
  })

  it('una fijación que solo depende de lo ya elegido sí se aplica de inmediato', () => {
    expect(recorrer(['perfil', 'hombre'])).toMatchObject({ base: 'dos-piezas', 'acabado-superior': 'simple' })
    expect(recorrer(['perfil', 'bebe'])).toMatchObject({ base: 'dos-piezas', 'grupo-talla': 'bebe' })
  })
})

describe('Anexo A 8.1 · perfiles y base', () => {
  it('ofrece exactamente cuatro perfiles (HU-04 CA1)', () => {
    expect(opciones({}, 'perfil')).toEqual(['mujer', 'hombre', 'nino', 'bebe'])
  })

  it('solo mujer elige base; el resto queda fijado en 2 piezas con mensaje (HU-05)', () => {
    expect(opciones(recorrer(['perfil', 'mujer']), 'base')).toEqual(['una-pieza', 'dos-piezas'])
    for (const perfil of ['hombre', 'nino', 'bebe']) {
      const s = recorrer(['perfil', perfil])
      expect(s.base).toBe('dos-piezas')
      expect(estadoDe(s, 'base')?.fijada?.mensaje).toBe('Pijama de 2 piezas')
    }
  })

  it('con base 1 pieza no hay parte inferior ni tela inferior (HU-05 CA3)', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'una-pieza'])
    for (const paso of ['tipo-inferior', 'abertura-lateral', 'acabado-inferior', 'tela-inferior', 'talla-inferior']) {
      expect(visible(s, paso)).toBe(false)
    }
  })
})

describe('Anexo A 8.2 y 8.3 · largo, botones y capri', () => {
  it('el largo corto (bralette crop) se ofrece con cualquier escote de blusa salvo camisero', () => {
    for (const escote of ['redondo', 'v', 'bralette']) {
      expect(opciones(recorrer(...mujerBlusa, ['escote', escote]), 'largo')).toEqual(['bralette-crop', 'cintura', 'cadera'])
    }
  })

  it('la blusa con cuello camisero queda fijada a la cadera con mensaje', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'camisero'], ['manga', 'corta'])
    expect(s.largo).toBe('cadera')
    expect(estadoDe(s, 'largo')?.fijada?.mensaje).toBe('La blusa con cuello camisero va a la cadera.')
    const errores = validarSeleccion(configuracion, { ...s, largo: 'cintura' }).errores
    expect(errores).toContainEqual(expect.objectContaining({ paso: 'largo', tipo: 'opcion-fijada' }))
  })

  it('cambiar a cuello camisero borra un largo que ya no aplica', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'corta'], ['largo', 'cintura'])
    const r = elegir(configuracion, s, 'escote', 'camisero')
    expect(r.seleccion.largo).toBe('cadera')
    expect(r.limpiados).toContain('largo')
  })

  it('botones a medio pecho solo para mujer', () => {
    for (const perfil of ['hombre', 'nino', 'bebe']) {
      expect(visible(recorrer(['perfil', perfil], ['escote', 'redondo'], ['manga', 'corta']), 'botones')).toBe(false)
    }
  })

  it('capri solo para mujer', () => {
    expect(opciones(recorrer(['perfil', 'mujer'], ['base', 'dos-piezas']), 'tipo-inferior')).toContain('capri')
    expect(opciones(recorrer(['perfil', 'hombre']), 'tipo-inferior')).toEqual(['pantalon-largo', 'short'])
  })
})

describe('R1 · bralette → manga fija en tirantes', () => {
  it('fija la manga con su mensaje', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'bralette'])
    expect(s.manga).toBe('tirantes')
    expect(estadoDe(s, 'manga')?.fijada).toMatchObject({ codigo: 'R1', mensaje: 'El escote bralette lleva tirantes.' })
  })
})

describe('R2 · cuello camisero → manga corta o larga, sin paso de botones', () => {
  it('solo ofrece manga corta o larga', () => {
    expect(opciones(recorrer(...mujerBlusa, ['escote', 'camisero']), 'manga')).toEqual(['corta', 'larga'])
    expect(opciones(recorrer(['perfil', 'nino'], ['escote', 'camisero']), 'manga')).toEqual(['corta', 'larga'])
  })

  it('no muestra botones a medio pecho', () => {
    expect(visible(recorrer(...mujerBlusa, ['escote', 'camisero'], ['manga', 'corta']), 'botones')).toBe(false)
  })

  it('la bata (1 pieza) no ofrece cuello camisero', () => {
    expect(opciones(recorrer(['perfil', 'mujer'], ['base', 'una-pieza']), 'escote')).not.toContain('camisero')
  })
})

describe('R3 · botones a medio pecho solo con sin manga o manga corta', () => {
  it('aparecen con sin manga y manga corta', () => {
    expect(visible(recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'sin-manga']), 'botones')).toBe(true)
    expect(visible(recorrer(...mujerBlusa, ['escote', 'v'], ['manga', 'corta']), 'botones')).toBe(true)
  })

  it('no aparecen con manga 3/4 o larga', () => {
    expect(visible(recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'tres-cuartos']), 'botones')).toBe(false)
    expect(visible(recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'larga']), 'botones')).toBe(false)
  })
})

describe('R4 · con tirantes no hay botones', () => {
  it('no muestra el paso de botones', () => {
    expect(visible(recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'tirantes']), 'botones')).toBe(false)
  })

  it('el servidor rechaza botones con tirantes', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'tirantes'])
    const errores = validarSeleccion(configuracion, { ...s, botones: 'si' }).errores
    expect(errores).toContainEqual(expect.objectContaining({ paso: 'botones', tipo: 'paso-no-aplica' }))
  })
})

describe('R5 · vuelitos exclusivo de perfiles femeninos', () => {
  it('mujer ve vuelitos arriba y en el short', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'corta'], ['botones', 'no'], ['largo', 'cadera'])
    expect(opciones(s, 'acabado-superior')).toContain('vuelitos')
    expect(opciones(recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'corta'], ['tipo-inferior', 'short']), 'acabado-inferior')).toContain('vuelitos')
  })

  it('niño o niña pregunta «¿Es para niña?» y solo con sí aparece vuelitos (HU-07 CA3)', () => {
    const base: [string, string][] = [['perfil', 'nino'], ['escote', 'redondo'], ['manga', 'corta']]
    expect(visible(recorrer(...base), 'es-nina')).toBe(true)
    expect(opciones(recorrer(...base, ['es-nina', 'si']), 'acabado-superior')).toEqual(['simple', 'vuelitos'])
    const nino = recorrer(...base, ['es-nina', 'no'])
    expect(opciones(nino, 'acabado-superior')).toEqual(['simple'])
    expect(nino['acabado-superior']).toBe('simple')
  })

  it('bebé también pregunta «¿Es para niña?»: con sí ofrece vuelitos arriba y en el short', () => {
    const base: [string, string][] = [['perfil', 'bebe'], ['escote', 'redondo'], ['manga', 'sin-manga']]
    expect(visible(recorrer(...base), 'es-nina')).toBe(true)
    const nina = recorrer(...base, ['es-nina', 'si'])
    expect(opciones(nina, 'acabado-superior')).toEqual(['simple', 'vuelitos'])
    expect(opciones(recorrer(...base, ['es-nina', 'si'], ['tipo-inferior', 'short']), 'acabado-inferior')).toEqual(['simple', 'vuelitos'])
    expect(recorrer(...base, ['es-nina', 'no'])['acabado-superior']).toBe('simple')
  })

  it('hombre no ve vuelitos y su acabado queda fijado en simple (HU-07 CA2)', () => {
    const s = recorrer(['perfil', 'hombre'], ['escote', 'redondo'], ['manga', 'corta'])
    expect(s['acabado-superior']).toBe('simple')
    expect(estadoDe(s, 'acabado-superior')?.fijada?.mensaje).toBe('Para hombre el acabado es simple.')
    expect(visible(s, 'es-nina')).toBe(false)
  })
})

describe('R6 · la tela se elige por pieza', () => {
  it('con 2 piezas pide dos telas y pueden ser distintas', () => {
    const s = recorrer(['perfil', 'hombre'], ['escote', 'redondo'], ['manga', 'corta'], ['tipo-inferior', 'short'], ['tela-superior', 'brush'], ['tela-inferior', 'satin'])
    expect(s['tela-superior']).toBe('brush')
    expect(s['tela-inferior']).toBe('satin')
  })

  it('cada tela trae foto y una descripción de 20 palabras o menos (HU-10 CA3); el satín lleva su etiqueta (CA5)', () => {
    for (const paso of configuracion.pasos.filter((p) => p.id.startsWith('tela-'))) {
      for (const tela of paso.opciones) {
        expect(tela.imagen).toMatch(/^\/telas\/.+\.jpg$/)
        expect(tela.descripcion?.split(/\s+/).length).toBeLessThanOrEqual(20)
      }
      expect(paso.opciones.find((t) => t.id === 'satin')?.etiqueta).toBe('Solo en piezas holgadas; requiere más tela.')
    }
  })

  it('hombre ve cinco telas; mujer y niños, seis (HU-10 CA2)', () => {
    expect(opciones(recorrer(['perfil', 'hombre']), 'tela-superior')).toHaveLength(5)
    expect(opciones(recorrer(['perfil', 'bebe']), 'tela-superior')).toHaveLength(6)
  })
})

describe('R7 · bata de salida', () => {
  const satinTirantesShort: [string, string][] = [
    ...mujerBlusa,
    ['escote', 'redondo'],
    ['manga', 'tirantes'],
    ['largo', 'cintura'],
    ['acabado-superior', 'simple'],
    ['tipo-inferior', 'short'],
    ['abertura-lateral', 'no'],
    ['acabado-inferior', 'simple'],
    ['tela-superior', 'satin'],
    ['tela-inferior', 'satin-alicrado'],
    ['modalidad-talla', 'universal'],
  ]

  it('aparece si se cumplen todas las condiciones', () => {
    expect(visible(recorrer(...satinTirantesShort, ['grupo-talla', 'adulto']), 'bata-salida')).toBe(true)
  })

  it('no aparece con pantalón largo, otra tela o manga distinta de tirantes', () => {
    const conTela = recorrer(...satinTirantesShort, ['grupo-talla', 'adulto'], ['tela-inferior', 'brush'])
    expect(visible(conTela, 'bata-salida')).toBe(false)
    const conLargo = recorrer(...satinTirantesShort, ['grupo-talla', 'adulto'], ['tipo-inferior', 'pantalon-largo'])
    expect(visible(conLargo, 'bata-salida')).toBe(false)
    const sinManga = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'sin-manga'], ['tela-superior', 'satin'], ['grupo-talla', 'adulto'])
    expect(visible(sinManga, 'bata-salida')).toBe(false)
  })

  it('al responder sí pide manga y acabado de la bata de salida', () => {
    const s = recorrer(...satinTirantesShort, ['grupo-talla', 'plus'], ['talla-superior', 'plus-2xl'], ['talla-inferior', 'plus-3xl'], ['bata-salida', 'si'])
    expect(opciones(s, 'bata-salida-manga')).toEqual(['tres-cuartos', 'larga'])
    expect(opciones(s, 'bata-salida-acabado')).toEqual(['simple', 'encaje', 'con-vivo'])
  })
})

describe('R8 · tallas distintas solo dentro del mismo grupo', () => {
  it('arriba y abajo ofrecen solo tallas del grupo elegido', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'], ['modalidad-talla', 'universal'], ['grupo-talla', 'plus'])
    expect(opciones(s, 'talla-superior')).toEqual(['plus-2xl', 'plus-3xl', 'plus-4xl', 'plus-5xl'])
    expect(opciones(s, 'talla-inferior')).toEqual(['plus-2xl', 'plus-3xl', 'plus-4xl', 'plus-5xl'])
  })

  it('el grupo se deriva del perfil en niños y bebés (HU-13 CA1)', () => {
    expect(recorrer(['perfil', 'bebe'])['grupo-talla']).toBe('bebe')
    expect(recorrer(['perfil', 'nino'])['grupo-talla']).toBe('nino')
  })

  it('el servidor rechaza mezclar grupos', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'], ['modalidad-talla', 'universal'], ['grupo-talla', 'adulto'])
    const errores = validarSeleccion(configuracion, { ...s, 'talla-superior': 'adulto-m', 'talla-inferior': 'plus-2xl' }).errores
    expect(errores).toContainEqual(expect.objectContaining({ paso: 'talla-inferior', codigo: 'R8' }))
  })
})

describe('R9 · satín puro solo en piezas holgadas (de la tela hacia escote y manga)', () => {
  it('elegir satín con manga corta deja un conflicto con su mensaje (HU-06 CA7)', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'corta'], ['tela-superior', 'satin'])
    const { conflictos, completo } = evaluarFlujo(configuracion, s)
    expect(s.manga).toBe('corta')
    expect(conflictos).toContainEqual({ paso: 'manga', codigo: 'R9', mensaje: 'El satín puro solo se confecciona en piezas holgadas.' })
    expect(completo).toBe(false)
  })

  it('al volver a manga con satín ya elegido solo se ofrecen tirantes o sin manga', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'redondo'], ['manga', 'corta'], ['tela-superior', 'satin'])
    expect(opciones(s, 'manga')).toEqual(['tirantes', 'sin-manga'])
    const corregida = elegir(configuracion, s, 'manga', 'sin-manga').seleccion
    expect(evaluarFlujo(configuracion, corregida).conflictos).toEqual([])
  })

  it('con cuello camisero el satín sí admite manga corta o larga', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'camisero'], ['manga', 'larga'], ['tela-superior', 'satin'])
    expect(evaluarFlujo(configuracion, s).conflictos).toEqual([])
  })

  it('en hombre, niños y bebé el satín arriba solo va con cuello camisero', () => {
    const s = recorrer(['perfil', 'hombre'], ['escote', 'redondo'], ['manga', 'sin-manga'], ['tela-superior', 'satin'])
    expect(evaluarFlujo(configuracion, s).conflictos).toContainEqual(expect.objectContaining({ paso: 'escote', codigo: 'R9' }))
    expect(opciones(s, 'escote')).toEqual(['camisero'])
  })

  it('no aplica al satín alicrado ni a la parte inferior', () => {
    const s = recorrer(...mujerBlusa, ['escote', 'bralette'], ['tela-superior', 'satin-alicrado'], ['tipo-inferior', 'pantalon-largo'], ['tela-inferior', 'satin'])
    expect(evaluarFlujo(configuracion, s).conflictos).toEqual([])
  })
})

describe('R10 · cuello camisero solo con satín, satín alicrado o modal', () => {
  it('con brush, rib o resorte arriba el camisero queda en conflicto (HU-06 CA8)', () => {
    for (const tela of ['brush', 'rib', 'resorte']) {
      const s = recorrer(['perfil', 'bebe'], ['escote', 'camisero'], ['manga', 'corta'], ['tela-superior', tela])
      expect(evaluarFlujo(configuracion, s).conflictos).toContainEqual(expect.objectContaining({ paso: 'escote', codigo: 'R10' }))
    }
  })

  it('con la tela ya elegida el camisero no se ofrece', () => {
    const s = recorrer(['perfil', 'nino'], ['escote', 'redondo'], ['manga', 'corta'], ['tela-superior', 'brush'])
    expect(opciones(s, 'escote')).toEqual(['redondo'])
  })

  it('con modal el camisero es válido', () => {
    const s = recorrer(['perfil', 'hombre'], ['escote', 'camisero'], ['manga', 'larga'], ['tela-superior', 'modal'])
    expect(evaluarFlujo(configuracion, s).conflictos).toEqual([])
  })
})

describe('flujo completo', () => {
  it('una selección hecha paso a paso pasa la revalidación del servidor', () => {
    const s = recorrer(
      ['perfil', 'nino'],
      ['escote', 'camisero'],
      ['manga', 'corta'],
      ['es-nina', 'si'],
      ['acabado-superior', 'vuelitos'],
      ['tipo-inferior', 'short'],
      ['acabado-inferior', 'vuelitos'],
      ['tela-superior', 'modal'],
      ['tela-inferior', 'brush'],
      ['modalidad-talla', 'universal'],
      ['talla-superior', 'nino-6'],
      ['talla-inferior', 'nino-8'],
    )
    expect(evaluarFlujo(configuracion, s).completo).toBe(true)
    expect(validarSeleccion(configuracion, s)).toEqual({ valida: true, errores: [] })
  })
})

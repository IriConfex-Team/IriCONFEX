import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  cargarConfiguracion,
  elegir,
  evaluarFlujo,
  ilustrar,
  ilustrarOpcion,
  iniciarSeleccion,
  mismaIlustracion,
  type Condicion,
  type Seleccion,
} from '../src'

const configuracion = cargarConfiguracion(
  JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8')),
)
const publica = join(__dirname, '../../web/public')

function recorrer(...elecciones: [string, string][]): Seleccion {
  return elecciones.reduce<Seleccion>(
    (seleccion, [paso, opcion]) => elegir(configuracion, seleccion, paso, opcion).seleccion,
    iniciarSeleccion(configuracion),
  )
}
const nombres = (seleccion: Seleccion) =>
  ilustrar(configuracion, seleccion)?.piezas.flatMap((p) => p.archivos.map((a) => a.replace('/ilustraciones/', ''))) ?? []

/** Pasos que cambian el dibujo: los que aparecen en condiciones o plantillas de la ilustración. */
function pasosQueDibujan(): Set<string> {
  const pasos = new Set<string>()
  const ids = new Set(configuracion.pasos.map((p) => p.id))
  const deCondicion = (c: Condicion): void => {
    if ('todas' in c) c.todas.forEach(deCondicion)
    else if ('alguna' in c) c.alguna.forEach(deCondicion)
    else pasos.add(c.paso)
  }
  const dePlantilla = (texto: string) => {
    for (const [, nombre] of texto.matchAll(/\{([^}]+)\}/g)) if (ids.has(nombre)) pasos.add(nombre)
  }
  const ilustracion = configuracion.ilustracion!
  Object.values(ilustracion.variables ?? {}).flat().forEach((v) => {
    dePlantilla(v.valor)
    if (v.cuando) deCondicion(v.cuando)
  })
  for (const pieza of ilustracion.piezas) {
    if (pieza.cuando) deCondicion(pieza.cuando)
    for (const capa of pieza.capas) {
      dePlantilla(capa.archivo)
      if (capa.cuando) deCondicion(capa.cuando)
    }
  }
  return pasos
}

describe('ilustración por capas (HU-06 CA4)', () => {
  it('toda combinación alcanzable en el flujo pide solo capas que existen', () => {
    const dibujan = pasosQueDibujan()
    const ultimo = Math.max(...[...dibujan].map((id) => configuracion.pasos.findIndex((p) => p.id === id)))
    const pedidos = new Set<string>()
    let combinaciones = 0

    const explorar = (seleccion: Seleccion, desde: number) => {
      nombres(seleccion).forEach((a) => pedidos.add(a))
      const estado = evaluarFlujo(configuracion, seleccion)
      const siguiente = estado.pasos.find(
        (e) => configuracion.pasos.indexOf(e.paso) >= desde && e.valor === undefined && !e.fijada,
      )
      const posicion = siguiente ? configuracion.pasos.indexOf(siguiente.paso) : Infinity
      if (!siguiente || posicion > ultimo) {
        combinaciones++
        return
      }
      const opciones = dibujan.has(siguiente.paso.id) ? siguiente.opciones : siguiente.opciones.slice(0, 1)
      for (const opcion of opciones) {
        explorar(elegir(configuracion, seleccion, siguiente.paso.id, opcion.id).seleccion, posicion + 1)
      }
    }
    explorar(iniciarSeleccion(configuracion), 0)

    const faltantes = [...pedidos].filter((archivo) => !existsSync(join(publica, 'ilustraciones', archivo)))
    expect(combinaciones).toBeGreaterThan(1000)
    expect(faltantes).toEqual([])
  })

  it('sin perfil no hay nada que dibujar', () => {
    expect(ilustrar(configuracion, {})).toBeNull()
  })

  it('con solo el perfil dibuja una prenda de referencia', () => {
    expect(nombres(recorrer(['perfil', 'hombre']))).toEqual([
      'hombre/inf/pretina/elastico.svg',
      'hombre/inf/tipo/pantalon-largo.svg',
      'hombre/sup/cuerpo/cadera.svg',
      'hombre/sup/manga/corta.svg',
      'hombre/sup/escote/redondo.svg',
    ])
  })

  it('arma la blusa según el LEEME: tirantes cambia el escote y suma acabados de manga y escote', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'], ['escote', 'v'], ['manga', 'tirantes'], ['largo', 'cintura'], ['acabado-superior', 'encaje'])
    expect(nombres(s).filter((a) => a.startsWith('mujer/sup'))).toEqual([
      'mujer/sup/cuerpo/cintura--ajustado.svg',
      'mujer/sup/manga/tirantes--ajustado.svg',
      'mujer/sup/escote/v--tirantes.svg',
      'mujer/sup/acabado-ruedo/encaje-cintura--ajustado.svg',
      'mujer/sup/acabado-manga/encaje-tirantes--ajustado.svg',
      'mujer/sup/acabado-escote/encaje-v--tirantes.svg',
    ])
  })

  it('el satín puro dibuja la versión holgada (R9)', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'una-pieza'], ['escote', 'redondo'], ['manga', 'sin-manga'], ['tela-superior', 'satin'])
    expect(nombres(s)).toContain('mujer/bata/cuerpo/rodilla--holgado.svg')
    expect(nombres(s)).toContain('mujer/sup/manga/sin-manga--holgado.svg')
  })

  it('la vista previa de una opción aplica la misma limpieza que elegirla', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'], ['escote', 'redondo'], ['manga', 'corta'], ['largo', 'cadera'], ['acabado-superior', 'repulgo'])
    // Manga larga no admite repulgo: la vista previa no pide «repulgo-larga».
    const vista = ilustrarOpcion(configuracion, s, 'manga', 'larga')
    expect(vista?.piezas.flatMap((p) => p.archivos).some((a) => a.includes('repulgo'))).toBe(false)
  })

  it('detecta cuándo las opciones de un paso no cambian el dibujo', () => {
    const s = recorrer(['perfil', 'mujer'], ['base', 'dos-piezas'])
    const tallas = ['universal', 'medida'].map((o) => ilustrarOpcion(configuracion, s, 'modalidad-talla', o))
    expect(mismaIlustracion(tallas[0], tallas[1])).toBe(true)
    const escotes = ['redondo', 'v'].map((o) => ilustrarOpcion(configuracion, s, 'escote', o))
    expect(mismaIlustracion(escotes[0], escotes[1])).toBe(false)
  })
})

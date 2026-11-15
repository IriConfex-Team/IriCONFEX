import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  cargarConfiguracion,
  coloresDeLaTela,
  coloresVigentes,
  esquemaSolicitud,
  ErrorConfiguracion,
  nombreDelColor,
  pasosConColor,
  tonosPorPieza,
  validarColores,
  type Seleccion,
} from '../src'

// HU-12a contra los datos reales: el catálogo de colores por tela que envió la clienta.
const datos = JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8'))
const configuracion = cargarConfiguracion(datos)

const dosPiezas: Seleccion = {
  perfil: 'mujer',
  base: 'dos-piezas',
  'tela-superior': 'brush',
  'tela-inferior': 'satin',
}

describe('HU-12a · qué colores se piden', () => {
  it('uno por cada tela elegida', () => {
    expect(pasosConColor(configuracion, dosPiezas)).toEqual([
      { paso: 'tela-superior', nombre: 'Color de la parte de arriba', tela: 'brush' },
      { paso: 'tela-inferior', nombre: 'Color de la parte de abajo', tela: 'satin' },
    ])
  })

  it('sin tela elegida todavía, no se pide su color', () => {
    const { 'tela-inferior': _, ...soloArriba } = dosPiezas
    expect(pasosConColor(configuracion, soloArriba).map((p) => p.paso)).toEqual(['tela-superior'])
  })

  it('una pieza: solo el color de la tela que aplica', () => {
    const { 'tela-inferior': _, ...resto } = dosPiezas
    expect(pasosConColor(configuracion, { ...resto, base: 'una-pieza' }).map((p) => p.paso)).toEqual(['tela-superior'])
  })

  it('cada tela trae su catálogo (lisos y estampados)', () => {
    const grupos = coloresDeLaTela(configuracion, 'brush')
    expect(grupos.map((g) => g.titulo)).toEqual(['Colores lisos', 'Estampados'])
    expect(grupos[0].colores.every((c) => c.tono)).toBe(true)
    expect(grupos[1].colores.every((c) => !c.tono)).toBe(true)
    // Todas las telas que se ofrecen tienen catálogo.
    for (const tela of configuracion.pasos.find((p) => p.id === 'tela-superior')!.opciones) {
      expect(coloresDeLaTela(configuracion, tela.id).length, tela.id).toBeGreaterThan(0)
    }
  })
})

describe('HU-12a · nombres y validación', () => {
  it('nombra el color del catálogo, el estampado y el otro color', () => {
    expect(nombreDelColor(configuracion, 'brush', { catalogo: 'c1-rosado-claro' })).toBe('Rosado Claro (C1)')
    expect(nombreDelColor(configuracion, 'brush', { catalogo: 'flores' })).toBe('Flores (estampado)')
    expect(nombreDelColor(configuracion, 'brush', { otro: ' vino ' })).toBe('Otro color: vino')
  })

  it('al cambiar la tela se borra el color del catálogo anterior, pero no el «otro»', () => {
    const colores = { 'tela-superior': { catalogo: 'c1-rosado-claro' }, 'tela-inferior': { otro: 'vino' } }
    expect(coloresVigentes(configuracion, dosPiezas, colores)).toEqual(colores)
    expect(coloresVigentes(configuracion, { ...dosPiezas, 'tela-superior': 'modal', 'tela-inferior': 'rib' }, colores)).toEqual({
      'tela-inferior': { otro: 'vino' },
    })
  })

  it('el servidor exige un color válido por tela y nada más', () => {
    const bien = { 'tela-superior': { catalogo: 'c1-rosado-claro' }, 'tela-inferior': { catalogo: 'st-29' } }
    expect(validarColores(configuracion, dosPiezas, bien)).toEqual({ valido: true, errores: [] })

    const tipos = (colores: Parameters<typeof validarColores>[2]) =>
      validarColores(configuracion, dosPiezas, colores).errores.map((e) => `${e.paso}:${e.tipo}`)
    expect(tipos(undefined)).toEqual(['tela-superior:falta', 'tela-inferior:falta'])
    expect(tipos({ ...bien, 'tela-inferior': { catalogo: 'c1-rosado-claro' } })).toEqual(['tela-inferior:invalido'])
    expect(tipos({ ...bien, 'tela-inferior': { otro: 'x'.repeat(61) } })).toEqual(['tela-inferior:invalido'])
    expect(tipos({ ...bien, bata: { otro: 'azul' } })).toEqual(['bata:no-aplica'])
  })

  it('la solicitud lleva los colores', () => {
    const solicitud = {
      categoria: 'pijamas',
      seleccion: dosPiezas,
      colores: { 'tela-superior': { catalogo: 'c1-rosado-claro' }, 'tela-inferior': { otro: 'vino' } },
      contacto: { nombre: 'Ana', telefono: '88887777' },
      consentimiento: { aceptado: true, fecha: new Date().toISOString() },
    }
    expect(esquemaSolicitud.safeParse(solicitud).success).toBe(true)
    expect(esquemaSolicitud.safeParse({ ...solicitud, colores: { 'tela-superior': { otro: '' } } }).success).toBe(false)
  })

  it('pinta las piezas de cada parte con el tono de su tela', () => {
    const tonos = tonosPorPieza(configuracion, dosPiezas, { 'tela-superior': { catalogo: 'c1-rosado-claro' }, 'tela-inferior': { catalogo: 'st-29' } })
    expect(tonos['mujer-blusa']).toBe('#FFCCDB')
    // El estampado no tiene tono: esa pieza queda en el gris neutro.
    expect(Object.values(tonos)).toEqual(Object.values(tonos).filter((t) => t === '#FFCCDB'))
  })
})

describe('HU-12a · la configuración de colores se revisa al cargar', () => {
  it('una tela que no es opción de los pasos con color', () => {
    const malo = structuredClone(datos)
    malo.colores.porTela.lino = malo.colores.porTela.brush
    expect(() => cargarConfiguracion(malo)).toThrow(ErrorConfiguracion)
  })

  it('un color repetido en la misma tela', () => {
    const malo = structuredClone(datos)
    const lisos = malo.colores.porTela.rib.grupos[0].colores
    lisos.push(lisos[0])
    expect(() => cargarConfiguracion(malo)).toThrow(/repetido/)
  })
})

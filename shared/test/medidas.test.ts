import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  camposQueAplican,
  cargarConfiguracion,
  esquemaSolicitud,
  ErrorConfiguracion,
  imagenDelCampo,
  leerNumero,
  pideMedidas,
  revisarMedidasEscritas,
  validarMedidas,
  type Seleccion,
} from '../src'

// HU-14 contra los datos reales: campos del Anexo A 8.7, rangos y guía visual por campo.
const datos = JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8'))
const configuracion = cargarConfiguracion(datos)
const publica = join(__dirname, '../../web/public')

const ids = (seleccion: Seleccion) => camposQueAplican(configuracion, seleccion).flatMap((g) => g.campos.map((c) => c.id))

const mujerBlusaCorta: Seleccion = {
  perfil: 'mujer',
  base: 'dos-piezas',
  manga: 'corta',
  'tipo-inferior': 'short',
  'modalidad-talla': 'medida',
  'grupo-talla': 'adulto',
}

describe('HU-14 · qué medidas se piden', () => {
  it('solo con «Mis medidas» (CA1)', () => {
    expect(pideMedidas(configuracion, mujerBlusaCorta)).toBe(true)
    expect(pideMedidas(configuracion, { ...mujerBlusaCorta, 'modalidad-talla': 'universal' })).toBe(false)
    expect(camposQueAplican(configuracion, { ...mujerBlusaCorta, 'modalidad-talla': 'presencial' })).toEqual([])
  })

  it('2 piezas con manga y short: los 13 campos del Anexo A 8.7 (CA3)', () => {
    expect(ids(mujerBlusaCorta)).toEqual([
      'ancho-espalda',
      'contorno-busto',
      'separacion-busto',
      'altura-busto',
      'largo-talle',
      'largo-total',
      'largo-manga',
      'ancho-manga',
      'contorno-cintura',
      'contorno-cadera',
      'altura-cadera',
      'largo-tiro',
      'largo-short',
    ])
  })

  it('sin manga no se piden largo ni ancho de manga; con bata de salida sí', () => {
    const tirantes = { ...mujerBlusaCorta, manga: 'tirantes' }
    expect(ids(tirantes)).not.toContain('largo-manga')
    expect(ids({ ...tirantes, 'bata-salida': 'si' })).toEqual(expect.arrayContaining(['largo-manga', 'ancho-manga']))
  })

  it('1 pieza (bata): solo la parte de arriba (CA3)', () => {
    const bata = { ...mujerBlusaCorta, base: 'una-pieza', 'tipo-inferior': undefined } as unknown as Seleccion
    const grupos = camposQueAplican(configuracion, bata)
    expect(grupos.map((g) => g.titulo)).toEqual(['Parte de arriba'])
  })

  it('largo de short con short; largo de pantalón con pantalón largo o capri', () => {
    expect(ids(mujerBlusaCorta)).not.toContain('largo-pantalon')
    for (const tipo of ['pantalon-largo', 'capri']) {
      const conPantalon = ids({ ...mujerBlusaCorta, 'tipo-inferior': tipo })
      expect(conPantalon).toContain('largo-pantalon')
      expect(conPantalon).not.toContain('largo-short')
    }
  })

  it('a hombre no se le piden separación ni altura de busto', () => {
    const hombre = ids({ ...mujerBlusaCorta, perfil: 'hombre' })
    expect(hombre).not.toContain('separacion-busto')
    expect(hombre).not.toContain('altura-busto')
    expect(hombre).toHaveLength(11)
  })

  it('cada campo tiene su guía visual para los perfiles que pueden elegir «Mis medidas» (CA4)', () => {
    const faltantes = []
    for (const perfil of ['mujer', 'hombre']) {
      for (const campo of configuracion.medidas!.grupos.flatMap((g) => g.campos)) {
        const ruta = imagenDelCampo(campo, { perfil })
        if (!ruta || !existsSync(join(publica, ruta))) faltantes.push(`${perfil}: ${campo.id} → ${ruta}`)
      }
    }
    expect(faltantes).toEqual([])
  })
})

describe('HU-14 · validación de rangos (CA5)', () => {
  it('lee coma o punto decimal y rechaza texto', () => {
    expect(leerNumero(' 85,5 ')).toBe(85.5)
    expect(leerNumero('90')).toBe(90)
    expect(leerNumero('90 cm')).toBeUndefined()
    expect(leerNumero('-3')).toBeUndefined()
  })

  it('no deja seguir con campos vacíos ni fuera de rango', () => {
    const { medidas, errores } = revisarMedidasEscritas(configuracion, mujerBlusaCorta, {
      'ancho-espalda': '38',
      'contorno-busto': '400',
      'separacion-busto': 'abc',
    })
    expect(medidas).toEqual({ 'ancho-espalda': 38 })
    expect(errores['contorno-busto']).toBe('Escribe un número entre 65 y 175 cm.')
    expect(errores['separacion-busto']).toMatch(/entre 10 y 32 cm/)
    expect(errores['altura-busto']).toBe('Completa este campo.')
    expect(Object.keys(errores)).toHaveLength(12)
  })

  it('el servidor rechaza faltantes, fuera de rango y campos que no aplican', () => {
    const tirantes: Seleccion = { ...mujerBlusaCorta, manga: 'tirantes' }
    const campos = camposQueAplican(configuracion, tirantes).flatMap((g) => g.campos)
    const completas = Object.fromEntries(campos.map((c) => [c.id, (c.min + c.max) / 2]))
    expect(validarMedidas(configuracion, tirantes, completas).valida).toBe(true)

    const { errores } = validarMedidas(configuracion, tirantes, {
      ...completas,
      'contorno-busto': 20,
      'largo-manga': 50,
      'altura-busto': undefined as unknown as number,
    })
    expect(errores.map((e) => `${e.campo}:${e.tipo}`).sort()).toEqual([
      'altura-busto:falta',
      'contorno-busto:fuera-de-rango',
      'largo-manga:no-aplica',
    ])
  })

  it('sin «Mis medidas» no se aceptan medidas', () => {
    const universal = { ...mujerBlusaCorta, 'modalidad-talla': 'universal' }
    expect(validarMedidas(configuracion, universal, undefined).valida).toBe(true)
    expect(validarMedidas(configuracion, universal, { 'ancho-espalda': 40 }).valida).toBe(false)
  })
})

describe('HU-14 · configuración y solicitud', () => {
  it('la solicitud acepta las medidas (CA6)', () => {
    const solicitud = esquemaSolicitud.parse({
      categoria: 'pijamas',
      seleccion: mujerBlusaCorta,
      medidas: { 'ancho-espalda': 38.5 },
      contacto: { nombre: 'Ana', telefono: '8888-7777' },
      consentimiento: { aceptado: true, fecha: '2026-11-06T18:00:00.000Z' },
    })
    expect(solicitud.medidas).toEqual({ 'ancho-espalda': 38.5 })
  })

  it('detecta referencias rotas y rangos al revés', () => {
    const roto = structuredClone(datos)
    roto.medidas.antesDe = 'no-existe'
    roto.medidas.grupos[0].campos[0].imagen = '/medidas/{nada}/x.svg'
    roto.medidas.grupos[0].campos[1].id = roto.medidas.grupos[0].campos[0].id
    expect(() => cargarConfiguracion(roto)).toThrow(ErrorConfiguracion)
    try {
      cargarConfiguracion(roto)
    } catch (e) {
      expect((e as ErrorConfiguracion).problemas).toEqual([
        'medidas, antesDe: el paso «no-existe» no existe',
        'medidas, campo «ancho-espalda»: «{nada}» no es un paso',
        'medidas, campo «ancho-espalda»: repetido',
      ])
    }
    const alReves = structuredClone(datos)
    alReves.medidas.grupos[0].campos[0].min = 99
    expect(() => cargarConfiguracion(alReves)).toThrow(/min debe ser menor que max/)
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cargarConfiguracion, evaluarFlujo, guiaDelPaso, parteDelPaso, type Seleccion } from '../src'

const datos = JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8'))
const configuracion = cargarConfiguracion(datos)
const paso = (id: string) => configuracion.pasos.find((p) => p.id === id)!

function guia(pasoId: string, seleccion: Seleccion) {
  const estado = evaluarFlujo(configuracion, seleccion).pasos.find((e) => e.paso.id === pasoId)!
  return guiaDelPaso(estado.paso, seleccion, estado.opciones)
}

const mujerUniversal: Seleccion = { perfil: 'mujer', base: 'dos-piezas', 'modalidad-talla': 'universal', 'grupo-talla': 'adulto' }

describe('parte de la prenda en talla y tela', () => {
  it('arriba y abajo con 2 piezas; «Bata» con 1 pieza', () => {
    expect(parteDelPaso(paso('talla-superior'), mujerUniversal)?.nombre).toBe('Parte de arriba')
    expect(parteDelPaso(paso('talla-inferior'), mujerUniversal)?.nombre).toBe('Parte de abajo')
    expect(parteDelPaso(paso('tela-superior'), { perfil: 'mujer', base: 'una-pieza' })).toMatchObject({
      nombre: 'Bata',
      piezas: ['mujer-bata'],
    })
  })
})

describe('HU-13 · guía de tallas', () => {
  it('mujer adulto: solo las filas S a XL que se ofrecen, con busto y cintura arriba', () => {
    const g = guia('talla-superior', mujerUniversal)!
    expect(g.columnas).toEqual(['Busto', 'Cintura'])
    expect(g.filas.map((f) => f.opcion.nombre)).toEqual(['S', 'M', 'L', 'XL'])
    expect(guia('talla-inferior', mujerUniversal)!.columnas).toEqual(['Cintura', 'Cadera'])
  })

  it('cada perfil y grupo tiene su tabla con sus filas', () => {
    const plus = guia('talla-superior', { ...mujerUniversal, 'grupo-talla': 'plus' })!
    expect(plus.filas.map((f) => f.opcion.nombre)).toEqual(['2XL', '3XL', '4XL', '5XL'])
    const hombre = { perfil: 'hombre', base: 'dos-piezas', 'modalidad-talla': 'universal', 'grupo-talla': 'adulto' }
    expect(guia('talla-superior', hombre)!.columnas).toEqual(['Pecho', 'Cintura'])
    const nino = guia('talla-inferior', { perfil: 'nino', base: 'dos-piezas', 'modalidad-talla': 'universal', 'grupo-talla': 'nino' })!
    expect(nino.columnas).toEqual(['Estatura', 'Cintura', 'Cadera'])
    expect(nino.filas).toHaveLength(6)
    const bebe = guia('talla-superior', { perfil: 'bebe', base: 'dos-piezas', 'modalidad-talla': 'universal', 'grupo-talla': 'bebe' })!
    expect(bebe.columnas).toEqual(['Estatura (cm)', 'Peso (kg)'])
    expect(bebe.imagen).toBeUndefined()
  })

  it('las filas de cada talla no se traslapan y suben de talla en talla', () => {
    for (const pasoId of ['talla-superior', 'talla-inferior']) {
      for (const g of paso(pasoId).guia!) {
        g.columnas.forEach((columna, c) => {
          const rangos = g.filas.map((f) => f.valores[c].replace(/,/g, '.').split('–').map(Number))
          for (let i = 1; i < rangos.length; i++) {
            expect(rangos[i][0], `${pasoId} ${columna} fila ${i}`).toBeGreaterThanOrEqual(rangos[i - 1][1])
            expect(rangos[i][1]).toBeGreaterThan(rangos[i][0])
          }
        })
      }
    }
  })

  it('detecta piezas que no existen y filas con valores de más', () => {
    const roto = structuredClone(datos)
    const talla = roto.pasos.find((p: { id: string }) => p.id === 'talla-superior')
    talla.parte[0].piezas = ['no-existe']
    talla.guia[0].filas[0].valores.push('1')
    expect(() => cargarConfiguracion(roto)).toThrow(/la pieza «no-existe» no está en la ilustración/)
    expect(() => cargarConfiguracion(roto)).toThrow(/la fila «adulto-s» tiene 3 valores y hay 2 columnas/)
  })
})

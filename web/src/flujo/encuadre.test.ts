import { describe, expect, it } from 'vitest'
import { encuadrar, unirCajas } from './encuadre'

describe('encuadre de miniaturas', () => {
  it('une dos zonas en la caja que las contiene', () => {
    expect(unirCajas({ x: 10, y: 20, ancho: 30, alto: 10 }, { x: 0, y: 25, ancho: 15, alto: 40 })).toEqual({
      x: 0,
      y: 20,
      ancho: 40,
      alto: 45,
    })
  })

  it('agrega margen, respeta la proporción y queda centrado en la zona', () => {
    const zona = { x: 160, y: 30, ancho: 80, alto: 40 }
    const caja = encuadrar(zona, 1.5)
    expect(caja.ancho / caja.alto).toBeCloseTo(1.5)
    expect(caja.ancho).toBeGreaterThan(zona.ancho)
    expect(caja.x + caja.ancho / 2).toBeCloseTo(200)
    expect(caja.y + caja.alto / 2).toBeCloseTo(50)
  })
})

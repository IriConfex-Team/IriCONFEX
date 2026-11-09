import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cargarConfiguracion, elegir, evaluarFlujo, iniciarSeleccion, type Seleccion } from '../src'

const configuracion = cargarConfiguracion(
  JSON.parse(readFileSync(join(__dirname, '../../datos/categorias/pijamas.json'), 'utf8')),
)

function recorrer(...elecciones: [string, string][]): Seleccion {
  return elecciones.reduce<Seleccion>(
    (seleccion, [paso, opcion]) => elegir(configuracion, seleccion, paso, opcion).seleccion,
    iniciarSeleccion(configuracion),
  )
}

const visible = (seleccion: Seleccion, paso: string) =>
  evaluarFlujo(configuracion, seleccion).pasos.some((e) => e.paso.id === paso)

describe('HU-06 · aberturas', () => {
  it('solo se ofrecen en la bata (1 pieza)', () => {
    expect(visible(recorrer(['perfil', 'mujer'], ['base', 'una-pieza']), 'aberturas')).toBe(true)
    expect(visible(recorrer(['perfil', 'mujer'], ['base', 'dos-piezas']), 'aberturas')).toBe(false)
    expect(visible(recorrer(['perfil', 'hombre']), 'aberturas')).toBe(false)
  })
})
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// HU-23 CA1: el código del motor y de la vista genérica no contiene nombres de prendas, telas ni acabados.
// Los nombres salen de los archivos de datos; aquí se buscan en el código fuente (sin contar pruebas).
const raiz = join(__dirname, '../..')
const carpetasDeCodigo = ['shared/src', 'web/src/flujo']

function archivosFuente(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta)
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

function nombresDeLosDatos(): string[] {
  const carpeta = join(raiz, 'datos/categorias')
  const nombres = new Set<string>()
  for (const archivo of readdirSync(carpeta).filter((n) => n.endsWith('.json'))) {
    const datos = JSON.parse(readFileSync(join(carpeta, archivo), 'utf8')) as {
      pasos: { opciones: { id: string; nombre: string }[] }[]
    }
    for (const opcion of datos.pasos.flatMap((paso) => paso.opciones)) {
      // Palabras cortas («sí», «no», «S», «2») darían falsos positivos.
      for (const texto of [opcion.nombre, opcion.id]) if (texto.length >= 5) nombres.add(texto.toLowerCase())
    }
  }
  return [...nombres]
}

describe('HU-23 CA1 · sin nombres de la configuración en el código', () => {
  const nombres = nombresDeLosDatos()
  const archivos = carpetasDeCodigo.flatMap((carpeta) => archivosFuente(join(raiz, carpeta)))

  it('encuentra datos y código que revisar', () => {
    expect(nombres.length).toBeGreaterThan(20)
    expect(archivos.length).toBeGreaterThan(0)
  })

  it.each(carpetasDeCodigo)('%s no menciona prendas, telas ni acabados', (carpeta) => {
    const hallazgos = archivos
      .filter((archivo) => archivo.startsWith(join(raiz, carpeta)))
      .flatMap((archivo) => {
        const contenido = readFileSync(archivo, 'utf8').toLowerCase()
        return nombres
          .filter((nombre) => new RegExp(`(^|[^\\p{L}])${nombre.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(contenido))
          .map((nombre) => `${archivo.slice(raiz.length + 1)}: «${nombre}»`)
      })
    expect(hallazgos).toEqual([])
  })
})

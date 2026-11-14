import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock global del fetch para evitar conexiones reales a localhost
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request) => {
      const urlString = url.toString()

      // Solo simulamos la API de colores (la única que hace fetch en el flujo)
      if (urlString.includes('/api/colores')) {
        return new Response(
          JSON.stringify({
            datos: [
              { id: 1, nombre: 'Rojo', tipo: 'LISO', tonoHex: '#ff0000', variante: null, mostrarImagenes: true, archivoOrigen: null },
              { id: 2, nombre: 'Azul', tipo: 'LISO', tonoHex: '#0000ff', variante: null, mostrarImagenes: true, archivoOrigen: null },
              { id: 3, nombre: 'Brush', tipo: 'LISO', tonoHex: '#cccccc', variante: null, mostrarImagenes: true, archivoOrigen: null },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Si alguna prueba intenta llamar a otra URL, lanzamos un error claro
      return Promise.reject(new Error(`[Fetch Mock] URL no simulada en pruebas: ${urlString}`))
    })
  )
})
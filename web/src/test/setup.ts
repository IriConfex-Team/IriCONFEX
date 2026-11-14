import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock global del fetch para evitar conexiones reales a localhost en las pruebas
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request) => {
      const urlString = url.toString()

      // 1. Simulamos la respuesta de la API de colores
      if (urlString.includes('/api/colores')) {
        return new Response(
          JSON.stringify({
            datos: [
              { id: 1, nombre: 'Rojo', tipo: 'LISO', tonoHex: '#ff0000', variante: null, mostrarImagenes: true, archivoOrigen: null },
              { id: 2, nombre: 'Azul', tipo: 'LISO', tonoHex: '#0000ff', variante: null, mostrarImagenes: true, archivoOrigen: null },
              { id: 3, nombre: 'Modal', tipo: 'LISO', tonoHex: '#cccccc', variante: null, mostrarImagenes: true, archivoOrigen: null },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 2. Simulamos la respuesta de la API de telas (si la usas)
      if (urlString.includes('/api/telas') || urlString.includes('/api/categorias')) {
        return new Response(
          JSON.stringify({
            datos: [
              { id: 1, nombre: 'Brush' },
              { id: 2, nombre: 'Modal' },
              { id: 3, nombre: 'Satín' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 3. Si la prueba intenta llamar a una URL no controlada, lanzamos un error claro
      return Promise.reject(new Error(`[Fetch Mock] URL no simulada en pruebas: ${urlString}`))
    })
  )
})
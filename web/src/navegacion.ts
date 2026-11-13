import { useEffect, useState } from 'react'

/**
 * Navegación mínima con el historial del navegador (sin dependencias): cada pantalla tiene su ruta y el botón
 * «atrás» del celular funciona. Vercel ya reescribe toda ruta a index.html.
 */
export function navegar(ruta: string) {
  if (ruta !== window.location.pathname) {
    window.history.pushState(null, '', ruta)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  window.scrollTo(0, 0)
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(() => window.location.pathname)
  useEffect(() => {
    const alCambiar = () => setRuta(window.location.pathname)
    window.addEventListener('popstate', alCambiar)
    return () => window.removeEventListener('popstate', alCambiar)
  }, [])
  return ruta
}

/** Rutas de la aplicación. */
export const rutas = {
  inicio: '/',
  categorias: '/categorias',
  disenar: (categoria: string) => `/disenar/${categoria}`,
}

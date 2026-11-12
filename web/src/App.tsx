import { lazy, Suspense } from 'react'
import { enviarSolicitud } from './api/cliente'
import { configuraciones } from './flujo/configuraciones'
import { navegar, rutas, useRuta } from './navegacion'
import { Categorias } from './pages/Categorias'
import { Inicio } from './pages/Inicio'

// HU-01 CA3: el inicio carga solo lo suyo; el flujo y las demás páginas se descargan al entrar.
const FlujoConfiguracion = lazy(() => import('./flujo/FlujoConfiguracion').then((m) => ({ default: m.FlujoConfiguracion })))
const DesignPreview = lazy(() => import('./pages/DesignPreview').then((m) => ({ default: m.DesignPreview })))
const PaginaPrivacidad = lazy(() => import('./pages/PaginaPrivacidad').then((m) => ({ default: m.PaginaPrivacidad })))

function App() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-fondo" />}>
      <Rutas />
    </Suspense>
  )
}

// Rutas: / inicio y /categorias (HU-01), /disenar/<categoría> el flujo genérico (HU-23), que envía la solicitud
// a la API (HU-22, HU-25); /privacidad la política de datos (HU-20) y /design el sistema de diseño (T-04).
function Rutas() {
  const ruta = useRuta()
  const negocio = configuraciones[0]?.negocio
  if (ruta.startsWith('/design')) return <DesignPreview />
  if (ruta.startsWith('/privacidad') && negocio) return <PaginaPrivacidad negocio={negocio} />

  const enDiseno = /^\/disenar\/([^/]+)/.exec(ruta)
  const elegida = enDiseno && configuraciones.find((c) => c.categoria.id === enDiseno[1])
  if (elegida) {
    return (
      <FlujoConfiguracion
        key={elegida.categoria.id}
        configuracion={elegida}
        onSolicitar={enviarSolicitud}
        onSalir={() => navegar(rutas.categorias)}
      />
    )
  }
  if (ruta.startsWith(rutas.categorias)) {
    return (
      <Categorias
        configuraciones={configuraciones}
        onElegir={(id) => navegar(rutas.disenar(id))}
        onAtras={() => navegar(rutas.inicio)}
      />
    )
  }
  return <Inicio destacada={configuraciones[0]} onEmpezar={() => navegar(rutas.categorias)} />
}

export default App

import { configuraciones } from './flujo/configuraciones'
import { FlujoConfiguracion } from './flujo/FlujoConfiguracion'
import { DesignPreview } from './pages/DesignPreview'
import { PaginaPrivacidad } from './pages/PaginaPrivacidad'

// Sin router todavía: /design muestra el sistema de diseño (T-04), /privacidad la política de datos (HU-20)
// y el resto, el flujo genérico (HU-23).
function App() {
  const ruta = window.location.pathname
  const configuracion = configuraciones[0]
  if (ruta.startsWith('/design')) return <DesignPreview />
  if (ruta.startsWith('/privacidad') && configuracion.negocio) return <PaginaPrivacidad negocio={configuracion.negocio} />
  return <FlujoConfiguracion configuracion={configuracion} />
}

export default App

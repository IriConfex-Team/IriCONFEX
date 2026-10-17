import { configuraciones } from './flujo/configuraciones'
import { FlujoConfiguracion } from './flujo/FlujoConfiguracion'
import { DesignPreview } from './pages/DesignPreview'

// Sin router todavía: /design muestra el sistema de diseño (T-04); el resto, el flujo genérico (HU-23).
function App() {
  if (window.location.pathname.startsWith('/design')) return <DesignPreview />
  return <FlujoConfiguracion configuracion={configuraciones[0]} />
}

export default App

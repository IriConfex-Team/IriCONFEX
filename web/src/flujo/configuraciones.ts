import { cargarConfiguracion, type ConfiguracionCategoria } from '@iriconfex/shared'

// Temporal: mientras la API no sirva la configuración desde la base de datos (T-05, HU-24a),
// se lee de los mismos archivos versionados que carga el script. Cambiar esto no toca la vista.
const archivos = import.meta.glob<unknown>('../../../datos/categorias/*.json', { eager: true, import: 'default' })

export const configuraciones: ConfiguracionCategoria[] = Object.values(archivos).map((datos) => cargarConfiguracion(datos))

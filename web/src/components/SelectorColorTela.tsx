import { useEffect, useState } from 'react'
import { cx } from '../lib/cx'

interface ColorApi {
  id: number
  clave: string
  tipo: 'LISO' | 'ESTAMPADO'
  variante: string | null
  codigoCatalogo: string | null
  nombre: string
  tonoHex: string | null
  archivoOrigen: string | null
  disenos: number | null
  mostrarImagenes: boolean
}

export function SelectorColorTela({ paso, seleccion, onSeleccionar }: any) {
  const [coloresCatalogo, setColoresCatalogo] = useState<ColorApi[]>([])
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [colorPersonalizado, setColorPersonalizado] = useState('')
  const [mostrarInput, setMostrarInput] = useState(false)

  // Identifica la tela elegida en el paso anterior ('tela-superior' o 'tela-inferior')
  const idPasoTela = paso.id.replace('color', 'tela')
  const telaElegida = seleccion[idPasoTela]

  useEffect(() => {
    if (!telaElegida) return

    let activo = true
    setCargando(true)
    setErrorCarga(null)

    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/colores?tela=${encodeURIComponent(telaElegida)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!activo) return
        setColoresCatalogo(Array.isArray(json.datos) ? json.datos : [])
      })
      .catch((err) => {
        if (!activo) return
        console.error('Error cargando colores:', err)
        setErrorCarga('No se pudieron cargar los colores del catálogo.')
        setColoresCatalogo([])
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [telaElegida])

  if (!telaElegida) {
    return <p className="estilo-pequeno text-texto-secundario">Por favor elige una tela primero.</p>
  }

  const valorActual = seleccion[paso.id]

  const manejarSeleccionCatalogo = (color: ColorApi) => {
    setMostrarInput(false)
    onSeleccionar(`catálogo:${color.nombre}`)
  }

  const manejarSeleccionPersonalizada = (valor: string) => {
    setColorPersonalizado(valor)
    onSeleccionar(`personalizado:${valor}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {cargando && (
        <p className="estilo-pequeno text-texto-secundario">Cargando paleta de colores...</p>
      )}

      {errorCarga && (
        <p className="estilo-pequeno text-red-600">{errorCarga}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {coloresCatalogo.map((color) => {
          const seleccionado = valorActual === `catálogo:${color.nombre}` && !mostrarInput
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => manejarSeleccionCatalogo(color)}
              className={cx(
                'flex cursor-pointer flex-col items-center gap-2 rounded-tarjeta border p-3 transition-colors',
                seleccionado
                  ? 'border-primario bg-primario-suave'
                  : 'border-borde bg-superficie hover:border-primario-suave',
              )}
            >
              {color.tipo === 'LISO' ? (
                <span
                  className="h-10 w-10 rounded-full border border-borde shadow-sm"
                  style={{ backgroundColor: color.tonoHex ?? '#E5E7EB' }}
                />
              ) : color.archivoOrigen && color.mostrarImagenes ? (
                <img
                  src={color.archivoOrigen}
                  alt={color.nombre}
                  className="h-10 w-10 rounded-full border border-borde object-cover shadow-sm"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-borde bg-superficie text-xs font-semibold text-texto-secundario">
                  Estampado
                </span>
              )}

              <span className="text-center estilo-pequeno font-semibold text-texto">
                {color.nombre}
              </span>
              {color.variante && (
                <span className="text-xs text-texto-secundario capitalize">{color.variante}</span>
              )}
            </button>
          )
        })}

        {/* Opción fija "Otro color" (HU-12a CA1) */}
        <button
          type="button"
          onClick={() => {
            setMostrarInput(true)
            onSeleccionar(`personalizado:${colorPersonalizado}`)
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-tarjeta border p-3 transition-colors',
            mostrarInput
              ? 'border-primario bg-primario-suave'
              : 'border-borde bg-superficie hover:border-primario-suave',
          )}
        >
          <span className="estilo-pequeno font-semibold text-texto">+ Otro color</span>
        </button>
      </div>

      {/* Rótulos dinámicos de disponibilidad (HU-12a CA2 y CA3) */}
      {!mostrarInput && valorActual && valorActual.startsWith('catálogo:') && (
        <p className="m-0 rounded-campo bg-primario-suave p-3 text-center estilo-pequeno font-semibold text-primario-texto">
          Color del catálogo, sujeto a disponibilidad.
        </p>
      )}

      {mostrarInput && (
        <div className="flex flex-col gap-2 rounded-campo border border-primario-suave bg-superficie p-3">
          <label htmlFor="input-color" className="estilo-pequeno font-semibold text-texto">
            ¿Qué color o estampado buscas?
          </label>
          <input
            id="input-color"
            type="text"
            maxLength={60}
            value={colorPersonalizado}
            onChange={(e) => manejarSeleccionPersonalizada(e.target.value)}
            placeholder="Ej: Rojo vino, estampado de flores..."
            className="rounded-campo border border-borde p-2 text-texto focus:border-primario focus:outline-none"
          />
          <p className="m-0 estilo-pequeno text-texto-secundario">
            Color de referencia: la costurera confirmará si lo consigue.
          </p>
        </div>
      )}
    </div>
  )
}
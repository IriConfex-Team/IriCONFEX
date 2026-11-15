import { useEffect, useState } from 'react'
import { COSTA_RICA } from '../../data/costaRica'
import { cx } from '../../lib/cx'

interface SelectorEntregaProps {
  valor?: string
  onElegir: (valor: string) => void
}

export function parsearEntrega(valor?: string) {
  if (!valor) return { modalidad: null as 'retiro' | 'envio' | null, provincia: '', canton: '', distrito: '', senas: '' }
  if (valor === 'retiro') return { modalidad: 'retiro' as const, provincia: '', canton: '', distrito: '', senas: '' }
  if (valor.startsWith('envio')) {
    const crudo = valor.includes(':') ? valor.slice(valor.indexOf(':') + 1) : ''
    const [provincia = '', canton = '', distrito = '', senas = ''] = crudo.split('|')
    return { modalidad: 'envio' as const, provincia, canton, distrito, senas }
  }
  return { modalidad: null, provincia: '', canton: '', distrito: '', senas: '' }
}

export function SelectorEntrega({ valor, onElegir }: SelectorEntregaProps) {
  const inicial = parsearEntrega(valor)
  const [modalidad, setModalidad] = useState<'retiro' | 'envio' | null>(inicial.modalidad)
  const [provincia, setProvincia] = useState(inicial.provincia)
  const [canton, setCanton] = useState(inicial.canton)
  const [distrito, setDistrito] = useState(inicial.distrito)
  const [senas, setSenas] = useState(inicial.senas)

  useEffect(() => {
    if (modalidad === 'retiro') {
      onElegir('retiro')
    } else if (modalidad === 'envio') {
      if (provincia && canton && distrito && senas.trim().length > 0) {
        onElegir(`envio:${provincia}|${canton}|${distrito}|${senas.trim()}`)
      } else {
        // Valor marcador mientras completa el formulario; la validación de pantalla bloqueará "Siguiente"
        onElegir('envio:')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalidad, provincia, canton, distrito, senas])

  const cantonesDisponibles = COSTA_RICA.find((p) => p.nombre === provincia)?.cantones ?? []
  const distritosDisponibles = cantonesDisponibles.find((c) => c.nombre === canton)?.distritos ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Tarjetas de modalidad (HU-16 / HU-17) */}
      <div
        role="radiogroup"
        aria-label="Modalidad de entrega"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <button
          type="button"
          role="radio"
          aria-label="Retiro en el local"
          aria-checked={modalidad === 'retiro'}
          onClick={() => setModalidad('retiro')}
          className={cx(
            'flex cursor-pointer flex-col items-start gap-1 rounded-tarjeta border p-4 text-left transition-colors',
            modalidad === 'retiro'
              ? 'border-primario bg-primario-suave'
              : 'border-borde bg-superficie hover:border-primario-suave',
          )}
        >
          <span className="estilo-cuerpo-fuerte text-texto">Retiro en el local</span>
          <span className="estilo-pequeno text-texto-secundario">Sin costo adicional</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-label="Envío a domicilio"
          aria-checked={modalidad === 'envio'}
          onClick={() => setModalidad('envio')}
          className={cx(
            'flex cursor-pointer flex-col items-start gap-1 rounded-tarjeta border p-4 text-left transition-colors',
            modalidad === 'envio'
              ? 'border-primario bg-primario-suave'
              : 'border-borde bg-superficie hover:border-primario-suave',
          )}
        >
          <span className="estilo-cuerpo-fuerte text-texto">Envío a domicilio</span>
          <span className="estilo-pequeno text-texto-secundario">Costa Rica (Correos / mensajería)</span>
        </button>
      </div>

      {/* Formulario encadenado solo cuando elige Envío (HU-17 CA1 y CA2) */}
      {modalidad === 'envio' && (
        <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="envio-provincia" className="estilo-pequeno font-semibold text-texto">
              Provincia
            </label>
            <select
              id="envio-provincia"
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value)
                setCanton('')
                setDistrito('')
              }}
              className="rounded-campo border border-borde bg-superficie p-2.5 text-texto focus:border-primario focus:outline-none"
            >
              <option value="">Selecciona una provincia</option>
              {COSTA_RICA.map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="envio-canton" className="estilo-pequeno font-semibold text-texto">
              Cantón
            </label>
            <select
              id="envio-canton"
              value={canton}
              disabled={!provincia}
              onChange={(e) => {
                setCanton(e.target.value)
                setDistrito('')
              }}
              className="rounded-campo border border-borde bg-superficie p-2.5 text-texto disabled:opacity-50 focus:border-primario focus:outline-none"
            >
              <option value="">Selecciona un cantón</option>
              {cantonesDisponibles.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="envio-distrito" className="estilo-pequeno font-semibold text-texto">
              Distrito
            </label>
            <select
              id="envio-distrito"
              value={distrito}
              disabled={!canton}
              onChange={(e) => setDistrito(e.target.value)}
              className="rounded-campo border border-borde bg-superficie p-2.5 text-texto disabled:opacity-50 focus:border-primario focus:outline-none"
            >
              <option value="">Selecciona un distrito</option>
              {distritosDisponibles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="envio-senas" className="estilo-pequeno font-semibold text-texto">
                Señas exactas
              </label>
              <span className="estilo-pequeno text-texto-secundario">{senas.length}/200</span>
            </div>
            <textarea
              id="envio-senas"
              rows={3}
              maxLength={200}
              value={senas}
              onChange={(e) => setSenas(e.target.value)}
              placeholder="Ej: 150 metros norte de la iglesia, casa color crema con portón negro."
              className="rounded-campo border border-borde bg-superficie p-2.5 text-texto focus:border-primario focus:outline-none"
            />
          </div>

          {/* Aviso obligatorio HU-17 CA2 */}
          <p className="m-0 rounded-campo bg-primario-suave p-3 text-center estilo-pequeno font-semibold text-primario-texto">
            El costo del envío lo confirma la costurera.
          </p>
        </div>
      )}
    </div>
  )
}

export function esEntregaIncompleta(valor?: string): boolean {
  if (!valor || valor === 'retiro') return false
  const d = parsearEntrega(valor)
  return !d.provincia || !d.canton || !d.distrito || d.senas.trim().length === 0
}

export function formatearValorEntrega(valor?: string): string | null {
  if (!valor || !valor.includes(':')) return null
  const [provincia = '', canton = '', distrito = '', senas = ''] = valor.slice(valor.indexOf(':') + 1).split('|')
  return `Envío a domicilio — ${provincia}, ${canton}, ${distrito} (${senas})`
}
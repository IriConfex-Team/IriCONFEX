import { coloresDeLaTela, type ColorCatalogo, type ColorElegido, type ConfiguracionCategoria, type PasoConColor } from '@iriconfex/shared'
import { useId, type CSSProperties, type ReactNode } from 'react'
import iconoCheck from '../assets/icons/check.svg'
import { AvisoEnLinea, CampoMedida } from '../components/ui'
import { cx } from '../lib/cx'

export interface PantallaColorProps {
  configuracion: ConfiguracionCategoria
  /** La tela cuyo color se elige. */
  pedido: PasoConColor
  elegido?: ColorElegido
  onElegir: (color: ColorElegido) => void
  /** Tras intentar seguir con «otro» vacío. */
  mostrarErrores: boolean
}

/**
 * HU-12a: el color de una pieza entre los del catálogo de su tela, o «otro» escrito por la persona,
 * con el rótulo de disponibilidad de lo elegido. Los colores salen de la configuración.
 */
export function PantallaColor({ configuracion, pedido, elegido, onElegir, mostrarErrores }: PantallaColorProps) {
  const colores = configuracion.colores
  if (!colores) return null
  const catalogo = colores.porTela[pedido.tela]
  const grupos = coloresDeLaTela(configuracion, pedido.tela)
  const elegidoDelCatalogo = elegido && 'catalogo' in elegido ? grupos.flatMap((g) => g.colores).find((c) => c.id === elegido.catalogo) : undefined
  const otro = elegido && 'otro' in elegido ? elegido.otro : undefined

  // Lo elegido del catálogo se confirma arriba (la lista es larga); el rótulo de «otro» va junto a su campo.
  const rotuloCatalogo = elegidoDelCatalogo && (elegidoDelCatalogo.tono ? colores.rotuloCatalogo : colores.rotuloEstampado)

  return (
    <>
      {colores.nota && <AvisoEnLinea>{colores.nota}</AvisoEnLinea>}
      {catalogo?.nota && <AvisoEnLinea>{catalogo.nota}</AvisoEnLinea>}
      {elegidoDelCatalogo && (
        <Rotulo>
          <span className="block estilo-cuerpo-fuerte">Elegiste: {elegidoDelCatalogo.nombre}</span>
          {rotuloCatalogo}
        </Rotulo>
      )}
      {grupos.map((grupo) => (
        <Grupo key={grupo.titulo} titulo={grupo.titulo} etiqueta={`${pedido.nombre}: ${grupo.titulo.toLowerCase()}`}>
          {grupo.colores.map((color) => (
            <Muestra
              key={color.id}
              color={color}
              seleccionada={elegidoDelCatalogo?.id === color.id}
              onSeleccionar={() => onElegir({ catalogo: color.id })}
            />
          ))}
        </Grupo>
      ))}

      <div role="radiogroup" aria-label={pedido.nombre} className="flex flex-col gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={otro !== undefined}
          onClick={() => onElegir({ otro: otro ?? '' })}
          className={cx(
            'flex min-h-14 cursor-pointer items-center justify-between rounded-tarjeta px-3.5 text-left estilo-cuerpo-fuerte',
            otro !== undefined
              ? 'border-2 border-primario bg-primario-suave text-primario-texto'
              : 'border border-borde bg-superficie text-texto',
          )}
        >
          {colores.otro.nombre}
          {otro !== undefined && <Marca />}
        </button>
        {otro !== undefined && (
          <CampoMedida
            etiqueta={colores.otro.pregunta}
            unidad=""
            inputMode="text"
            maxLength={colores.otro.maximo}
            placeholder={colores.otro.ejemplo}
            value={otro}
            autoFocus
            onChange={(e) => onElegir({ otro: e.target.value })}
            error={mostrarErrores && otro.trim() === '' ? 'Escribe el color que buscas.' : undefined}
          />
        )}
      </div>

      {otro !== undefined && <Rotulo>{colores.otro.rotulo}</Rotulo>}
    </>
  )
}

function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="m-0 rounded-campo bg-primario-suave p-3 text-center estilo-pequeno font-semibold text-primario-texto">
      {children}
    </p>
  )
}

function Grupo({ titulo, etiqueta, children }: { titulo: string; etiqueta: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="m-0 estilo-titulo-3 text-texto">
        {titulo}
      </h2>
      <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-4 gap-x-2 gap-y-3">
        {children}
      </div>
    </section>
  )
}

/** Muestra redonda del color; el estampado se representa con un patrón de puntos. */
function Muestra({ color, seleccionada, onSeleccionar }: { color: ColorCatalogo; seleccionada: boolean; onSeleccionar: () => void }) {
  const fondo: CSSProperties = color.tono
    ? { backgroundColor: color.tono }
    : {
        backgroundColor: 'var(--color-primario-suave)',
        backgroundImage: 'radial-gradient(var(--color-primario) 22%, transparent 24%)',
        backgroundSize: '10px 10px',
      }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      onClick={onSeleccionar}
      className="flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-campo p-1 text-center focus-visible:outline-2 focus-visible:outline-primario"
    >
      <span
        className={cx(
          'relative flex size-12 items-center justify-center rounded-full',
          seleccionada ? 'ring-3 ring-primario ring-offset-2 ring-offset-fondo' : 'border border-borde',
        )}
        style={fondo}
      >
        {seleccionada && <Marca />}
      </span>
      <span className={cx('estilo-pequeno leading-tight', seleccionada ? 'font-semibold text-primario-texto' : 'text-texto')}>
        {color.nombre}
      </span>
      {color.disenos && <span className="text-xs leading-tight text-texto-secundario">{color.disenos} diseños</span>}
    </button>
  )
}

function Marca() {
  return (
    <span className="flex size-6 items-center justify-center rounded-boton bg-primario">
      <img src={iconoCheck} alt="" width={16} height={16} />
    </span>
  )
}

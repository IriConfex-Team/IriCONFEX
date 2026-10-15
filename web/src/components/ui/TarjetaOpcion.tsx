import type { ReactNode } from 'react'
import iconoCheck from '../../assets/icons/check.svg'
import { cx } from '../../lib/cx'

export interface TarjetaOpcionProps {
  nombre: string
  /** Miniatura 80 × 80 de la ilustración por capas; va sobre lienzo neutro. */
  ilustracion?: ReactNode
  seleccionada?: boolean
  deshabilitada?: boolean
  /** Motivo visible cuando está deshabilitada. */
  motivo?: string
  onSeleccionar?: () => void
  className?: string
}

/**
 * Figma 02 · Tarjeta de opción (3:8587).
 * Se usa en rejilla de 2 columnas con separación 12 (ver RejillaOpciones).
 */
export function TarjetaOpcion({
  nombre,
  ilustracion,
  seleccionada = false,
  deshabilitada = false,
  motivo = 'No disponible',
  onSeleccionar,
  className,
}: TarjetaOpcionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      disabled={deshabilitada}
      onClick={onSeleccionar}
      className={cx(
        'flex h-44.5 w-full flex-col overflow-hidden rounded-tarjeta bg-superficie text-left',
        'focus-visible:outline-none focus-visible:border-3 focus-visible:border-primario',
        deshabilitada
          ? 'cursor-not-allowed border border-dashed border-borde'
          : seleccionada
            ? 'cursor-pointer border-2 border-primario'
            : 'cursor-pointer border border-borde',
        className,
      )}
    >
      <span className="relative flex h-30 w-full shrink-0 items-center justify-center bg-lienzo">
        {ilustracion}
        {seleccionada && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-boton bg-primario">
            <img src={iconoCheck} alt="" width={16} height={16} />
          </span>
        )}
      </span>
      <span
        className={cx(
          'flex w-full flex-1 flex-col gap-0.5 p-3.5',
          seleccionada && !deshabilitada ? 'bg-primario-suave' : 'bg-superficie',
        )}
      >
        <span
          className={cx(
            'estilo-cuerpo-fuerte',
            deshabilitada ? 'text-texto-secundario' : seleccionada ? 'text-primario-texto' : 'text-texto',
          )}
        >
          {nombre}
        </span>
        {deshabilitada && <span className="estilo-pequeno text-texto-secundario">{motivo}</span>}
      </span>
    </button>
  )
}

export interface RejillaOpcionesProps {
  etiqueta: string
  children: ReactNode
}

/** Contenedor accesible de tarjetas: 2 columnas, separación 12. */
export function RejillaOpciones({ etiqueta, children }: RejillaOpcionesProps) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-2 gap-3">
      {children}
    </div>
  )
}

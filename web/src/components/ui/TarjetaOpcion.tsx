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
  // Sin imagen (p. ej. tallas): tarjeta compacta, solo el nombre.
  const compacta = ilustracion === undefined || ilustracion === null
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      disabled={deshabilitada}
      onClick={onSeleccionar}
      className={cx(
        'flex w-full flex-col overflow-hidden rounded-tarjeta bg-superficie text-left',
        compacta ? 'min-h-14' : 'h-44.5',
        'focus-visible:outline-none focus-visible:border-3 focus-visible:border-primario',
        deshabilitada
          ? 'cursor-not-allowed border border-dashed border-borde'
          : seleccionada
            ? 'cursor-pointer border-2 border-primario'
            : 'cursor-pointer border border-borde',
        className,
      )}
    >
      {!compacta && (
        <span className="relative flex h-30 w-full shrink-0 items-center justify-center bg-lienzo">
          {ilustracion}
          {seleccionada && <MarcaSeleccion className="absolute top-2 right-2" />}
        </span>
      )}
      <span
        className={cx(
          'relative flex w-full flex-1 flex-col justify-center gap-0.5 p-3.5',
          compacta && seleccionada && 'pr-11',
          seleccionada && !deshabilitada ? 'bg-primario-suave' : 'bg-superficie',
        )}
      >
        {compacta && seleccionada && <MarcaSeleccion className="absolute top-1/2 right-3 -translate-y-1/2" />}
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

function MarcaSeleccion({ className }: { className: string }) {
  return (
    <span className={cx('flex size-6 items-center justify-center rounded-boton bg-primario', className)}>
      <img src={iconoCheck} alt="" width={16} height={16} />
    </span>
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

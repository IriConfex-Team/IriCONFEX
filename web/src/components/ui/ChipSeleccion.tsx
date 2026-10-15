import type { ButtonHTMLAttributes } from 'react'
import iconoCheck from '../../assets/icons/check.svg'
import { cx } from '../../lib/cx'

export interface ChipSeleccionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  seleccionado?: boolean
}

/** Figma 02 · Chip de selección (3:8566). Tallas y opciones cortas; área táctil 44 px. */
export function ChipSeleccion({ seleccionado = false, disabled, className, children, ...resto }: ChipSeleccionProps) {
  return (
    <button
      type="button"
      aria-pressed={seleccionado}
      disabled={disabled}
      className={cx(
        'inline-flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full px-4.5 estilo-cuerpo-fuerte',
        'focus-visible:outline-none focus-visible:border-2 focus-visible:border-primario',
        disabled
          ? 'cursor-not-allowed border border-dashed border-deshabilitado-borde text-texto-secundario'
          : seleccionado
            ? 'cursor-pointer bg-primario text-superficie'
            : 'cursor-pointer border border-borde-control bg-superficie text-texto',
        className,
      )}
      {...resto}
    >
      {seleccionado && !disabled && <img src={iconoCheck} alt="" width={16} height={16} />}
      {children}
    </button>
  )
}

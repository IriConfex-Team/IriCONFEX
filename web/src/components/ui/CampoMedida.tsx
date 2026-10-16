import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

export interface CampoMedidaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  etiqueta: string
  unidad?: string
  /** Mensaje de error; si existe, el campo se marca inválido. */
  error?: string
}

/** Figma 02 · Campo de medida (3:8640). Los rangos por campo vienen de la configuración (HU-14). */
export function CampoMedida({ etiqueta, unidad = 'cm', error, disabled, className, id, ...resto }: CampoMedidaProps) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const idError = `${idCampo}-error`
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={idCampo} className="estilo-pequeno text-texto">
        {etiqueta}
      </label>
      <div
        className={cx(
          'flex h-12 items-center justify-between gap-2 rounded-campo px-3.5',
          disabled
            ? 'border border-borde bg-superficie-beige'
            : error
              ? 'border-2 border-error bg-superficie'
              : 'border border-borde-control bg-superficie focus-within:border-2 focus-within:border-primario',
        )}
      >
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className="w-full min-w-0 bg-transparent estilo-cuerpo text-texto outline-none placeholder:text-texto-secundario disabled:text-texto-secundario"
          {...resto}
        />
        {!disabled && <span className="estilo-cuerpo text-texto-secundario">{unidad}</span>}
      </div>
      {error && (
        <p id={idError} className="m-0 estilo-pequeno text-error">
          {error}
        </p>
      )}
    </div>
  )
}

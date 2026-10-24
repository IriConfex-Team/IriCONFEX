import { useId, type ReactNode } from 'react'
import iconoCheck from '../../assets/icons/check.svg'
import { cx } from '../../lib/cx'

export interface TarjetaOpcionDetalladaProps {
  nombre: string
  /** Texto corto de uso (≤ 20 palabras, HU-10 CA3). */
  descripcion?: string
  /** Aviso destacado, p. ej. una condición de confección. */
  etiqueta?: string
  /** Fotografía o ilustración; va sobre lienzo neutro. */
  imagen?: ReactNode
  seleccionada?: boolean
  onSeleccionar?: () => void
}

/**
 * Variante en lista de la tarjeta de opción: imagen a la izquierda y texto a la derecha,
 * para opciones que necesitan descripción (telas). Mismos estados que TarjetaOpcion.
 */
export function TarjetaOpcionDetallada({
  nombre,
  descripcion,
  etiqueta,
  imagen,
  seleccionada = false,
  onSeleccionar,
}: TarjetaOpcionDetalladaProps) {
  const id = useId()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      aria-labelledby={`${id}-nombre`}
      aria-describedby={
        [descripcion && `${id}-descripcion`, etiqueta && `${id}-etiqueta`].filter(Boolean).join(' ') || undefined
      }
      onClick={onSeleccionar}
      className={cx(
        'flex w-full cursor-pointer items-stretch gap-3.5 overflow-hidden rounded-tarjeta p-2.5 text-left',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario',
        seleccionada ? 'border-2 border-primario bg-primario-suave' : 'border border-borde bg-superficie',
      )}
    >
      <span className="relative flex size-22 shrink-0 items-center justify-center overflow-hidden rounded-campo bg-lienzo">
        {imagen}
        {seleccionada && (
          <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-boton bg-primario">
            <img src={iconoCheck} alt="" width={16} height={16} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5 pr-1">
        <span id={`${id}-nombre`} className={cx('estilo-cuerpo-fuerte', seleccionada ? 'text-primario-texto' : 'text-texto')}>
          {nombre}
        </span>
        {descripcion && (
          <span id={`${id}-descripcion`} className="estilo-pequeno text-texto-secundario">
            {descripcion}
          </span>
        )}
        {etiqueta && (
          <span
            id={`${id}-etiqueta`}
            className="mt-0.5 self-start rounded-campo bg-aviso-suave px-2 py-0.5 estilo-pequeno text-aviso-texto"
          >
            {etiqueta}
          </span>
        )}
      </span>
    </button>
  )
}

/** Contenedor accesible de tarjetas en lista: una columna, separación 12. */
export function ListaOpciones({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-col gap-3">
      {children}
    </div>
  )
}

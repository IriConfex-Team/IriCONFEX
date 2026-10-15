import { formatColones } from '../../lib/formatColones'
import { cx } from '../../lib/cx'

export interface BarraInferiorFijaProps {
  /** Precio estimado total calculado en el servidor. `null` = falta en la tabla (a confirmar). */
  precioEstimado: number | null
  /** Deshabilita «Siguiente» hasta cumplir el paso. */
  deshabilitada?: boolean
  textoBoton?: string
  onSiguiente?: () => void
  className?: string
}

/**
 * Figma 02 · Barra inferior fija (3:8661).
 * Todo precio lleva «estimado». Si falta en la tabla: «Precio a confirmar por la costurera».
 */
export function BarraInferiorFija({
  precioEstimado,
  deshabilitada = false,
  textoBoton = 'Siguiente',
  onSiguiente,
  className,
}: BarraInferiorFijaProps) {
  return (
    <div
      className={cx(
        'flex w-full items-center justify-between gap-3 bg-superficie px-4 pt-3.5 pb-[max(18px,env(safe-area-inset-bottom))] shadow-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5" aria-live="polite">
        {precioEstimado === null ? (
          <p className="m-0 estilo-cuerpo-fuerte text-texto">Precio a confirmar por la costurera</p>
        ) : (
          <>
            <p className="m-0 estilo-pequeno text-texto-secundario">Precio estimado</p>
            <p className="m-0 estilo-precio text-texto">{formatColones(precioEstimado)}</p>
            <p className="m-0 estilo-pequeno text-texto-secundario">
              {deshabilitada ? 'Elige una opción para continuar.' : 'Sujeto a confirmación, no incluye envío.'}
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        disabled={deshabilitada}
        onClick={onSiguiente}
        className={cx(
          'flex h-12 w-30 shrink-0 items-center justify-center rounded-boton px-6 estilo-cuerpo-fuerte',
          'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario',
          deshabilitada
            ? 'cursor-not-allowed bg-borde text-texto-secundario'
            : 'cursor-pointer bg-primario text-superficie active:bg-primario-hover',
        )}
      >
        {textoBoton}
      </button>
    </div>
  )
}

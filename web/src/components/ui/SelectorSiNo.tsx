import iconoCheck from '../../assets/icons/check.svg'
import { cx } from '../../lib/cx'

export interface SelectorSiNoProps {
  /** Pregunta que se lee con lector de pantalla (p. ej. «¿Es para niña?»). */
  etiqueta: string
  /** `null` = sin responder. */
  valor: boolean | null
  onCambiar: (valor: boolean) => void
}

/** Figma 02 · Selector sí / no (3:8607). */
export function SelectorSiNo({ etiqueta, valor, onCambiar }: SelectorSiNoProps) {
  const opciones = [
    { texto: 'Sí', valor: true },
    { texto: 'No', valor: false },
  ]
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex h-13 w-full gap-1 rounded-boton bg-superficie-beige p-1">
      {opciones.map((opcion) => {
        const elegida = valor === opcion.valor
        return (
          <button
            key={opcion.texto}
            type="button"
            role="radio"
            aria-checked={elegida}
            onClick={() => onCambiar(opcion.valor)}
            className={cx(
              'flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] estilo-cuerpo-fuerte',
              'focus-visible:outline-2 focus-visible:outline-primario',
              elegida ? 'bg-primario text-superficie' : 'text-texto',
            )}
          >
            {elegida && <img src={iconoCheck} alt="" width={16} height={16} />}
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}

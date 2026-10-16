import type { ButtonHTMLAttributes } from 'react'
import iconoWhatsApp from '../../assets/icons/whatsapp.svg'
import { cx } from '../../lib/cx'

export type TipoBoton = 'primario' | 'secundario' | 'whatsapp'

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tipo?: TipoBoton
}

const estilosPorTipo: Record<TipoBoton, string> = {
  primario: 'bg-primario text-superficie active:bg-primario-hover',
  secundario:
    'bg-superficie text-texto border border-borde-control active:bg-superficie-beige',
  whatsapp: 'bg-whatsapp text-superficie gap-2 active:bg-whatsapp-presionado',
}

/**
 * Figma 02 · Botón (3:8555). Alto 48, radio 12, ancho completo en móvil.
 * Deshabilitado hasta cumplir el paso. Nunca «Confirmar» ni «Pedido».
 */
export function Boton({ tipo = 'primario', className, disabled, children, type = 'button', ...resto }: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'flex h-12 w-full items-center justify-center rounded-boton px-6 estilo-cuerpo-fuerte',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario',
        disabled
          ? 'cursor-not-allowed bg-borde text-texto-secundario'
          : cx('cursor-pointer', estilosPorTipo[tipo]),
        className,
      )}
      {...resto}
    >
      {tipo === 'whatsapp' && !disabled && <img src={iconoWhatsApp} alt="" width={20} height={20} />}
      {children}
    </button>
  )
}

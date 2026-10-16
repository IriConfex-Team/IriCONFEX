import type { ReactNode } from 'react'
import iconoAviso from '../../assets/icons/aviso-aviso.svg'
import iconoError from '../../assets/icons/aviso-error.svg'
import iconoExito from '../../assets/icons/aviso-exito.svg'
import iconoInfo from '../../assets/icons/aviso-info.svg'
import { cx } from '../../lib/cx'

export type TipoAviso = 'info' | 'aviso' | 'error' | 'exito'

const estilos: Record<TipoAviso, { caja: string; texto: string; icono: string }> = {
  info: { caja: 'bg-primario-suave', texto: 'text-primario-texto', icono: iconoInfo },
  aviso: { caja: 'bg-aviso-suave border border-aviso-borde', texto: 'text-aviso-texto', icono: iconoAviso },
  error: { caja: 'bg-error-suave', texto: 'text-error', icono: iconoError },
  exito: { caja: 'bg-exito-suave', texto: 'text-exito', icono: iconoExito },
}

export interface AvisoEnLineaProps {
  tipo?: TipoAviso
  children: ReactNode
  className?: string
}

/**
 * Figma 02 · Aviso en línea (3:8628).
 * Info en lavanda suave (también para opciones fijadas: «El escote bralette lleva tirantes»);
 * aviso para color de referencia; error de campo; éxito.
 */
export function AvisoEnLinea({ tipo = 'info', children, className }: AvisoEnLineaProps) {
  const estilo = estilos[tipo]
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cx('flex w-full items-start gap-2.5 rounded-boton px-4 py-3', estilo.caja, className)}
    >
      <img src={estilo.icono} alt="" width={18} height={18} className="mt-px shrink-0" />
      <p className={cx('m-0 flex-1 estilo-pequeno', estilo.texto)}>{children}</p>
    </div>
  )
}

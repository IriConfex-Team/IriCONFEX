import type { Ilustracion } from '@iriconfex/shared'
import { useCallback, useMemo, useState } from 'react'
import { cx } from '../lib/cx'
import { encuadrar, type Caja } from './encuadre'
import { IlustracionPrenda } from './IlustracionPrenda'

export interface VistaPrendaProps {
  ilustracion: Ilustracion | null
  grande?: boolean
  /** Piezas que se destacan (las demás se atenúan). */
  resaltar?: ReadonlySet<string>
  /** Reemplaza el tamaño y el relleno del recuadro. */
  className?: string
  descripcion?: string
  /** Proporción (ancho / alto) del recorte; conviene que sea la del recuadro. */
  proporcion?: number
}

/** La prenda armada hasta ahora, siempre sobre lienzo neutro, recortada al dibujo (sin lienzo vacío). */
export function VistaPrenda({
  ilustracion,
  grande = false,
  resaltar,
  className,
  descripcion = 'Vista previa de tu elección',
  proporcion = 1,
}: VistaPrendaProps) {
  const clave = JSON.stringify(ilustracion)
  const capas = useMemo(
    () => new Set(ilustracion?.piezas.flatMap((p) => p.archivos) ?? []) as ReadonlySet<string>,
    // `clave` resume `ilustracion`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave],
  )
  const [recorte, setRecorte] = useState<{ clave: string; caja: Caja | null } | null>(null)
  const alMedir = useCallback((caja: Caja | null) => setRecorte({ clave, caja }), [clave])
  if (!ilustracion) return null
  const caja = recorte?.clave === clave && recorte.caja ? encuadrar(recorte.caja, proporcion) : null
  return (
    <div
      className={cx(
        'flex items-center justify-center rounded-tarjeta bg-lienzo',
        className ?? (grande ? 'h-72 py-3' : 'h-48 py-3'),
      )}
    >
      <IlustracionPrenda
        ilustracion={ilustracion}
        enfoque={capas}
        onMedir={alMedir}
        vista={caja}
        resaltar={resaltar}
        descripcion={descripcion}
        className="h-full w-full"
      />
    </div>
  )
}

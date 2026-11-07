import {
  camposQueAplican,
  imagenDelCampo,
  revisarMedidasEscritas,
  type CampoMedidas,
  type ConfiguracionCategoria,
  type Seleccion,
} from '@iriconfex/shared'
import { useId, useState, type ReactNode } from 'react'
import { AvisoEnLinea, CampoMedida } from '../components/ui'

/** Lo que la persona escribió en cada campo, tal cual (se convierte a número al validar). */
export type MedidasEscritas = Readonly<Record<string, string>>

export interface PantallaMedidasProps {
  configuracion: ConfiguracionCategoria
  seleccion: Seleccion
  valores: MedidasEscritas
  onCambiar: (valores: MedidasEscritas) => void
  /** Tras intentar seguir: se muestran todos los errores, no solo los de campos ya visitados. */
  mostrarErrores: boolean
}

/**
 * HU-14: un campo por cada dato del cuerpo, con su guía visual, cómo tomarla y la unidad (CA3, CA4).
 * Los errores de rango aparecen al salir del campo o al intentar seguir (CA5).
 */
export function PantallaMedidas({ configuracion, seleccion, valores, onCambiar, mostrarErrores }: PantallaMedidasProps) {
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const { medidas } = configuracion
  if (!medidas) return null
  const { errores } = revisarMedidasEscritas(configuracion, seleccion, valores)

  return (
    <>
      {medidas.indicaciones && <AvisoEnLinea>{medidas.indicaciones.join(' ')}</AvisoEnLinea>}
      {camposQueAplican(configuracion, seleccion).map((grupo) => (
        <Grupo key={grupo.titulo} titulo={grupo.titulo}>
          {grupo.campos.map((campo) => (
            <Campo
              key={campo.id}
              campo={campo}
              imagen={imagenDelCampo(campo, seleccion)}
              unidad={medidas.unidad}
              valor={valores[campo.id] ?? ''}
              error={mostrarErrores || tocados[campo.id] ? errores[campo.id] : undefined}
              onCambiar={(texto) => onCambiar({ ...valores, [campo.id]: texto })}
              onSalir={() => setTocados((t) => ({ ...t, [campo.id]: true }))}
            />
          ))}
        </Grupo>
      ))}
    </>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="m-0 estilo-titulo-3 text-texto">
        {titulo}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">{children}</ul>
    </section>
  )
}

interface CampoProps {
  campo: CampoMedidas
  imagen?: string
  unidad: string
  valor: string
  error?: string
  onCambiar: (texto: string) => void
  onSalir: () => void
}

function Campo({ campo, imagen, unidad, valor, error, onCambiar, onSalir }: CampoProps) {
  return (
    <li className="flex gap-3 rounded-tarjeta border border-borde bg-superficie p-3">
      {imagen && (
        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-campo bg-lienzo">
          <img src={imagen} alt="" className="h-full w-full object-contain" loading="lazy" />
        </div>
      )}
      <CampoMedida
        className="min-w-0 flex-1"
        etiqueta={campo.nombre}
        etiquetaFuerte
        ayuda={campo.como}
        unidad={unidad}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        onBlur={onSalir}
        error={error}
      />
    </li>
  )
}

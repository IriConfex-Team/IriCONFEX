import iconoLocal from '../../assets/icons/local.svg'
import iconoPasoAnterior from '../../assets/icons/paso-anterior.svg'

export interface EncabezadoFlujoProps {
  /** Texto del perfil, p. ej. «Pijama para Mujer» (viene de la configuración). */
  perfil: string
  paso: string
  pasoActual: number
  totalPasos: number
  onAtras?: () => void
  onCambiarPerfil?: () => void
  onInfoLocal?: () => void
}

/** Figma 02 · Encabezado del flujo (3:8662). Perfil visible y cambiable durante todo el flujo (HU-04 CA3). */
export function EncabezadoFlujo({
  perfil,
  paso,
  pasoActual,
  totalPasos,
  onAtras,
  onCambiarPerfil,
  onInfoLocal,
}: EncabezadoFlujoProps) {
  const avance = totalPasos > 0 ? Math.min(100, (pasoActual / totalPasos) * 100) : 0
  return (
    <header className="flex w-full flex-col gap-2 border-b border-borde bg-fondo px-4 pt-1 pb-3">
      <div className="flex h-11 items-center gap-2">
        <button
          type="button"
          onClick={onAtras}
          aria-label="Paso anterior"
          className="-m-2.5 flex size-11 cursor-pointer items-center justify-center"
        >
          <img src={iconoPasoAnterior} alt="" width={24} height={24} />
        </button>
        <p className="m-0 flex-1 truncate estilo-cuerpo text-texto">{perfil}</p>
        <button
          type="button"
          onClick={onCambiarPerfil}
          className="cursor-pointer estilo-cuerpo-fuerte text-primario underline"
        >
          cambiar
        </button>
        <button
          type="button"
          onClick={onInfoLocal}
          aria-label="Información del local"
          className="-m-2.5 flex size-11 cursor-pointer items-center justify-center"
        >
          <img src={iconoLocal} alt="" width={24} height={24} />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 estilo-cuerpo-fuerte text-texto">{paso}</p>
        <p className="m-0 shrink-0 estilo-pequeno text-texto-secundario">
          Paso {pasoActual} de {totalPasos}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalPasos}
        aria-valuenow={pasoActual}
        aria-label="Avance"
        className="h-1.5 w-full overflow-hidden rounded-[3px] bg-borde"
      >
        <div className="h-full rounded-[3px] bg-primario" style={{ width: `${avance}%` }} />
      </div>
    </header>
  )
}

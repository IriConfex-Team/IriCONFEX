import iconoLocal from '../assets/icons/local.svg'
import iconoPasoAnterior from '../assets/icons/paso-anterior.svg'

/** Figma 10 · A01, A02: marca, volver (si aplica) y acceso a la información del local (HU-03). */
export function EncabezadoSitio({ onAtras, onInfoLocal }: { onAtras?: () => void; onInfoLocal?: () => void }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-borde bg-fondo px-4">
      {onAtras && (
        <button
          type="button"
          onClick={onAtras}
          aria-label="Volver"
          className="-m-2.5 flex size-11 cursor-pointer items-center justify-center"
        >
          <img src={iconoPasoAnterior} alt="" width={24} height={24} />
        </button>
      )}
      <p className="m-0 flex-1 estilo-titulo-1 text-texto">
        <span className="text-primario italic">Iri</span>Confex
      </p>
      {onInfoLocal && (
        <button
          type="button"
          onClick={onInfoLocal}
          aria-label="Información del local"
          className="-m-2.5 flex size-11 cursor-pointer items-center justify-center"
        >
          <img src={iconoLocal} alt="" width={24} height={24} />
        </button>
      )}
    </header>
  )
}

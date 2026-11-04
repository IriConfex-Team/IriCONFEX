import { formatoTelefono, type Negocio } from '@iriconfex/shared'
import { useEffect, useId, useRef } from 'react'
import iconoLocal from '../assets/icons/local.svg'
import iconoWhatsApp from '../assets/icons/whatsapp.svg'
import { enlaceMapa, enlaceWhatsApp } from './enlaces'

/** HU-03 CA2–CA4: dirección y señas (abren mapas), horario y WhatsApp (abre la conversación). */
export function TarjetaInfoLocal({ negocio, idTitulo }: { negocio: Negocio; idTitulo?: string }) {
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-4">
      <div className="flex items-center gap-2.5">
        <img src={iconoLocal} alt="" width={24} height={24} />
        <h2 id={idTitulo} className="m-0 estilo-titulo-3 text-texto">
          {negocio.nombre}
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        <p className="m-0 estilo-pequeno text-texto-secundario">Dirección</p>
        <a href={enlaceMapa(negocio)} target="_blank" rel="noreferrer" className="estilo-cuerpo-fuerte text-primario underline">
          {negocio.direccion}
        </a>
        {negocio.senas && <p className="m-0 estilo-cuerpo text-texto">{negocio.senas}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <p className="m-0 estilo-pequeno text-texto-secundario">Horario</p>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {negocio.horario.map((franja) => (
            <li key={franja.dias} className="flex justify-between gap-3 estilo-cuerpo text-texto">
              <span>{franja.dias}</span>
              <span className="shrink-0">{franja.horas}</span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={enlaceWhatsApp(negocio)}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-boton bg-whatsapp px-6 estilo-cuerpo-fuerte text-superficie active:bg-whatsapp-presionado focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        <img src={iconoWhatsApp} alt="" width={20} height={20} />
        WhatsApp {formatoTelefono(negocio.whatsapp)}
      </a>
    </section>
  )
}

/** HU-03 CA1: hoja que se abre desde el ícono del encabezado en cualquier pantalla. */
export function HojaInfoLocal({ negocio, abierta, onCerrar }: { negocio: Negocio; abierta: boolean; onCerrar: () => void }) {
  const idTitulo = useId()
  const cerrar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierta) return
    cerrar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta, onCerrar])

  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-texto/40" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-t-hoja bg-fondo px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-3"
      >
        <div className="flex justify-end">
          <button
            ref={cerrar}
            type="button"
            onClick={onCerrar}
            className="cursor-pointer estilo-cuerpo-fuerte text-primario underline"
          >
            Cerrar
          </button>
        </div>
        <TarjetaInfoLocal negocio={negocio} idTitulo={idTitulo} />
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { RespuestaSolicitud } from '../api/cliente'
import iconoWhatsApp from '../assets/icons/whatsapp.svg'
import { AvisoEnLinea, Boton } from '../components/ui'
import { copiarTexto } from './copiarTexto'

/** HU-22: la solicitud ya quedó registrada; el cliente la envía por WhatsApp o copia el mensaje. */
export function SolicitudEnviada({ respuesta }: { respuesta: RespuestaSolicitud }) {
  const [copiado, setCopiado] = useState<boolean | null>(null)

  const copiar = async () => setCopiado(await copiarTexto(respuesta.mensaje))

  return (
    <section aria-labelledby="titulo-enviada" className="flex flex-col gap-4">
      <h2 id="titulo-enviada" className="m-0 estilo-titulo-2 text-texto">
        ¡Tu solicitud está lista!
      </h2>

      <div className="flex flex-col gap-0.5 rounded-tarjeta bg-superficie-beige px-4 py-3">
        <p className="m-0 estilo-pequeno text-texto-secundario">Tu referencia</p>
        <p className="m-0 estilo-titulo-3 text-texto">{respuesta.referencia}</p>
      </div>

      <p className="m-0 estilo-cuerpo text-texto">
        Envía este mensaje a la costurera por WhatsApp y te responderá con tu cotización.
      </p>

      <pre className="m-0 whitespace-pre-wrap break-words rounded-tarjeta border border-borde bg-superficie p-4 font-sans estilo-pequeno text-texto">
        {respuesta.mensaje}
      </pre>

      <a
        href={respuesta.enlaceWhatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-boton bg-whatsapp px-6 estilo-cuerpo-fuerte text-superficie focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario active:bg-whatsapp-presionado"
      >
        <img src={iconoWhatsApp} alt="" width={20} height={20} />
        Abrir WhatsApp
      </a>

      <Boton tipo="secundario" onClick={copiar}>
        Copiar mensaje
      </Boton>

      {copiado === true && <AvisoEnLinea tipo="exito">Mensaje copiado.</AvisoEnLinea>}
      {copiado === false && (
        <AvisoEnLinea tipo="aviso">No se pudo copiar. Selecciona el texto y cópialo a mano.</AvisoEnLinea>
      )}
    </section>
  )
}
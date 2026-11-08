import type { ConfiguracionCategoria } from '@iriconfex/shared'
import { Boton } from '../components/ui'
import { ImagenCategoria, PaginaSitio } from './PaginaSitio'

/** Figma 10 · A01 Inicio: qué hace la costurera y entrada al diseño (HU-01). */
export function Inicio({ destacada, onEmpezar }: { destacada?: ConfiguracionCategoria; onEmpezar: () => void }) {
  return (
    <PaginaSitio negocio={destacada?.negocio}>
      {destacada && <ImagenCategoria configuracion={destacada} className="h-72 rounded-tarjeta" />}
      <div className="flex flex-col gap-3">
        <p className="m-0 estilo-etiqueta text-texto-secundario">Hecho a mano por tu costurera</p>
        <h1 className="m-0 estilo-display text-texto">Tu pijama, hecha a mano y a tu gusto</h1>
        <p className="m-0 estilo-cuerpo text-texto-secundario">
          Elige cada detalle, mira cómo va quedando y envía tu solicitud de cotización por WhatsApp. Tu costurera te
          confirma precio y entrega.
        </p>
      </div>
      <Boton onClick={onEmpezar}>Diseñar mi pijama</Boton>
      <p className="m-0 text-center estilo-pequeno text-texto-secundario">
        Los precios que ves son estimados. La costurera confirma todo por WhatsApp.
      </p>
    </PaginaSitio>
  )
}

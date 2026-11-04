import type { Negocio } from '@iriconfex/shared'

/** HU-03 CA3: la dirección abre la ubicación en mapas (el enlace de la configuración o una búsqueda). */
export const enlaceMapa = (negocio: Negocio) =>
  negocio.mapa ??
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${negocio.direccion}, Costa Rica`)}`

/** HU-03 CA4: conversación directa en WhatsApp, opcionalmente con un mensaje (HU-22). */
export const enlaceWhatsApp = (negocio: Negocio, mensaje?: string) =>
  `https://wa.me/506${negocio.whatsapp}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`

import { LIMITE_NOMBRE, validarContacto } from '@iriconfex/shared'
import { useState } from 'react'
import { AvisoEnLinea, CampoMedida } from '../components/ui'

export interface Contacto {
  nombre: string
  telefono: string
}

/**
 * HU-19: nombre y teléfono, los únicos datos personales obligatorios.
 * Los errores aparecen al salir del campo o al intentar seguir, no mientras se escribe.
 */
export function PantallaContacto({
  contacto,
  onCambiar,
  mostrarErrores,
}: {
  contacto: Contacto
  onCambiar: (contacto: Contacto) => void
  mostrarErrores: boolean
}) {
  const [tocados, setTocados] = useState({ nombre: false, telefono: false })
  const errores = validarContacto(contacto)
  const ver = (campo: keyof Contacto) => (mostrarErrores || tocados[campo] ? errores[campo] : undefined)

  return (
    <>
      <AvisoEnLinea>Solo te pedimos esto para que la costurera sepa quién le escribe.</AvisoEnLinea>
      <CampoMedida
        etiqueta="Nombre"
        unidad=""
        inputMode="text"
        autoComplete="name"
        maxLength={LIMITE_NOMBRE}
        value={contacto.nombre}
        onChange={(e) => onCambiar({ ...contacto, nombre: e.target.value })}
        onBlur={() => setTocados((t) => ({ ...t, nombre: true }))}
        error={ver('nombre')}
      />
      <CampoMedida
        etiqueta="Teléfono"
        unidad=""
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="8888-8888"
        value={contacto.telefono}
        onChange={(e) => onCambiar({ ...contacto, telefono: e.target.value })}
        onBlur={() => setTocados((t) => ({ ...t, telefono: true }))}
        error={ver('telefono')}
      />
    </>
  )
}

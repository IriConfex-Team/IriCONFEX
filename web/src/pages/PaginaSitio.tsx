import { ilustrar, type ConfiguracionCategoria, type Negocio } from '@iriconfex/shared'
import { useState, type ReactNode } from 'react'
import { HojaInfoLocal } from '../flujo/InfoLocal'
import { VistaPrenda } from '../flujo/VistaPrenda'
import { cx } from '../lib/cx'
import { EncabezadoSitio } from './EncabezadoSitio'

/** Marco de las pantallas fuera del flujo: encabezado con la marca y hoja del local. */
export function PaginaSitio({ negocio, onAtras, children }: { negocio?: Negocio; onAtras?: () => void; children: ReactNode }) {
  const [infoAbierta, setInfoAbierta] = useState(false)
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-fondo">
      <EncabezadoSitio onAtras={onAtras} onInfoLocal={negocio ? () => setInfoAbierta(true) : undefined} />
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">{children}</main>
      {negocio && <HojaInfoLocal negocio={negocio} abierta={infoAbierta} onCerrar={() => setInfoAbierta(false)} />}
    </div>
  )
}

/** Imagen representativa de la categoría (HU-01 CA1): su foto o, mientras no haya, la prenda dibujada. */
export function ImagenCategoria({ configuracion, className }: { configuracion: ConfiguracionCategoria; className?: string }) {
  const tarjeta = configuracion.categoria.tarjeta
  const clase = cx('w-full overflow-hidden bg-lienzo', className)
  if (tarjeta?.imagen) return <img src={tarjeta.imagen} alt="" className={cx(clase, 'object-cover')} />
  if (!tarjeta?.dibujo) return <div className={clase} />
  return (
    <VistaPrenda
      ilustracion={ilustrar(configuracion, tarjeta.dibujo.seleccion)}
      color={tarjeta.dibujo.color}
      descripcion=""
      className={cx(clase, 'py-5')}
      proporcion={1.4}
    />
  )
}

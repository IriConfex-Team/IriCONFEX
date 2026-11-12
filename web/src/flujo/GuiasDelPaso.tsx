import type { GuiaVisible, Ilustracion, ParteDelPaso } from '@iriconfex/shared'
import { useId } from 'react'
import { cx } from '../lib/cx'
import { VistaPrenda } from './VistaPrenda'

/**
 * Deja claro a qué parte de la prenda se refiere el paso (p. ej. la talla de arriba y después la de abajo):
 * la prenda con esa parte destacada y su nombre. Así el cambio de un paso al otro no parece un error.
 */
export function EncabezadoParte({ parte, ilustracion }: { parte: ParteDelPaso; ilustracion: Ilustracion | null }) {
  return (
    <div className="flex items-center gap-3 rounded-tarjeta bg-primario-suave p-3">
      {ilustracion && (
        <VistaPrenda
          ilustracion={ilustracion}
          resaltar={new Set(parte.piezas)}
          descripcion={`Pijama con la ${parte.nombre.toLowerCase()} destacada`}
          className="h-32 w-24 shrink-0 rounded-tarjeta bg-superficie p-1"
          proporcion={3 / 4}
        />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 estilo-titulo-3 text-primario-texto">{parte.nombre}</p>
        {parte.texto && <p className="m-0 estilo-pequeno text-primario-texto">{parte.texto}</p>}
      </div>
    </div>
  )
}

/** HU-13: tabla de referencia con dónde medir; resalta la fila de la opción elegida. */
export function GuiaDeOpciones({ guia, elegida }: { guia: GuiaVisible; elegida?: string }) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4">
      <h2 id={idTitulo} className="m-0 estilo-titulo-3 text-texto">
        {guia.titulo}
      </h2>

      {(guia.imagen || guia.medidas) && (
        <div className="flex gap-3">
          {guia.imagen && (
            <div className="h-36 w-27 shrink-0 overflow-hidden rounded-campo bg-lienzo">
              <img src={guia.imagen} alt="" className="h-full w-full object-contain" loading="lazy" />
            </div>
          )}
          {guia.medidas && (
            <dl className="m-0 flex flex-col gap-2">
              {guia.medidas.map((m) => (
                <div key={m.nombre}>
                  <dt className="estilo-cuerpo-fuerte text-texto">{m.nombre}</dt>
                  <dd className="m-0 estilo-pequeno text-texto-secundario">{m.como}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-campo border border-borde">
        <table className="w-full border-collapse text-center estilo-pequeno text-texto">
          <caption className="sr-only">{guia.titulo}: medidas por talla</caption>
          <thead>
            <tr className="bg-primario text-superficie">
              <th scope="col" className="px-2 py-2 text-left font-semibold">
                Talla
              </th>
              {guia.columnas.map((columna) => (
                <th key={columna} scope="col" className="px-2 py-2 font-semibold">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guia.filas.map((fila) => {
              const esElegida = fila.opcion.id === elegida
              return (
                <tr
                  key={fila.opcion.id}
                  aria-current={esElegida ? 'true' : undefined}
                  className={cx('border-t border-borde', esElegida && 'bg-primario-suave font-semibold')}
                >
                  <th scope="row" className="px-2 py-2 text-left font-semibold">
                    {fila.opcion.nombre}
                  </th>
                  {fila.valores.map((valor, i) => (
                    <td key={guia.columnas[i]} className="px-2 py-2">
                      {valor}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {guia.nota && <p className="m-0 estilo-pequeno text-texto-secundario">{guia.nota}</p>}
    </section>
  )
}

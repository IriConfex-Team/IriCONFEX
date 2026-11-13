import { formatoTelefono, type ConfiguracionCategoria, type EstadoFlujo, type EstadoPaso, type Negocio } from '@iriconfex/shared'
import { useId } from 'react'
import { Boton } from '../components/ui'
import { formatColones } from '../lib/formatColones'
import type { Contacto } from './PantallaContacto'
import { avisoDatos, TEXTO_ACEPTACION } from './textosDatos'

interface Fila {
  id: string
  etiqueta: string
  valor: string
  /** Sin valor: no se puede cambiar (opción fijada). */
  onCambiar?: () => void
}

export interface GrupoResumen {
  titulo: string
  filas: Fila[]
}

/** Agrupa los pasos respondidos según `resumen.secciones`; lo que no está en ninguna sección va al final. */
function agrupar(
  configuracion: ConfiguracionCategoria,
  estado: EstadoFlujo,
  onEditarPaso: (id: string) => void,
): GrupoResumen[] {
  const respondidos = estado.pasos.filter((e) => e.valor !== undefined)
  const fila = (e: EstadoPaso): Fila => ({
    id: e.paso.id,
    etiqueta: e.paso.nombre,
    valor: e.paso.opciones.find((o) => o.id === e.valor)?.nombre ?? '',
    onCambiar: e.fijada ? undefined : () => onEditarPaso(e.paso.id),
  })
  const secciones = configuracion.resumen?.secciones ?? []
  const usados = new Set(secciones.flatMap((s) => s.pasos))
  const grupos = secciones
    .map((s) => ({
      titulo: s.titulo,
      filas: s.pasos.flatMap((id) => respondidos.filter((e) => e.paso.id === id)).map(fila),
    }))
    .filter((g) => g.filas.length > 0)
  const otros = respondidos.filter((e) => !usados.has(e.paso.id)).map(fila)
  return otros.length > 0 ? [...grupos, { titulo: 'Otros detalles', filas: otros }] : grupos
}

function Grupo({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 estilo-titulo-3 text-texto">{titulo}</h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-tarjeta border border-borde bg-superficie p-0">
        {filas.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3 last:border-b-0">
            <span className="flex min-w-0 flex-col">
              <span className="estilo-pequeno text-texto-secundario">{f.etiqueta}</span>
              <span className="estilo-cuerpo-fuerte text-texto">{f.valor}</span>
            </span>
            {f.onCambiar && (
              <button
                type="button"
                onClick={f.onCambiar}
                aria-label={`Cambiar ${f.etiqueta}`}
                className="shrink-0 cursor-pointer estilo-cuerpo-fuerte text-primario underline"
              >
                cambiar
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface PantallaResumenProps {
  configuracion: ConfiguracionCategoria
  estado: EstadoFlujo
  contacto: Contacto
  /** Medidas propias (HU-14), después de las elecciones. */
  medidas?: GrupoResumen
  negocio?: Negocio
  /** Precio estimado calculado en el servidor (HU-18). `null` o sin valor: a confirmar por la costurera. */
  precio?: number | null
  aceptado: boolean
  onAceptar: (aceptado: boolean) => void
  onEditarPaso: (pasoId: string) => void
  onEditarContacto: () => void
  onSolicitar: () => void
  enviando?: boolean
}

/** HU-21: resumen completo con «cambiar» por campo; HU-20: aviso de datos antes de «Solicitar cotización». */
export function PantallaResumen({
  configuracion,
  estado,
  contacto,
  medidas,
  negocio,
  precio,
  aceptado,
  onAceptar,
  onEditarPaso,
  onEditarContacto,
  onSolicitar,
  enviando = false,
}: PantallaResumenProps) {
  const idAviso = useId()
  const datos: Fila[] = [
    { id: 'nombre', etiqueta: 'Nombre', valor: contacto.nombre.trim(), onCambiar: onEditarContacto },
    { id: 'telefono', etiqueta: 'Teléfono', valor: formatoTelefono(contacto.telefono), onCambiar: onEditarContacto },
  ]
  const requiereAviso = negocio !== undefined

  return (
    <>
      <Grupo titulo="Tus datos" filas={datos} />
      {agrupar(configuracion, estado, onEditarPaso).map((g) => (
        <Grupo key={g.titulo} titulo={g.titulo} filas={g.filas} />
      ))}
      {medidas && medidas.filas.length > 0 && <Grupo titulo={medidas.titulo} filas={medidas.filas} />}

      <section className="flex flex-col gap-0.5 rounded-tarjeta bg-superficie-beige px-4 py-3">
        <p className="m-0 estilo-pequeno text-texto-secundario">Precio estimado</p>
        <p className="m-0 estilo-cuerpo-fuerte text-texto">{typeof precio === 'number' ? formatColones(precio) : 'A confirmar por la costurera'}</p>
        <p className="m-0 estilo-pequeno text-texto-secundario">Estimado, sujeto a confirmación, no incluye envío.</p>
      </section>

      {negocio && (
        <section aria-labelledby={idAviso} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4">
          <h2 id={idAviso} className="m-0 estilo-titulo-3 text-texto">
            Uso de tus datos
          </h2>
          <p className="m-0 estilo-pequeno text-texto">{avisoDatos(negocio)}</p>
          <a href="/privacidad" target="_blank" rel="noreferrer" className="self-start estilo-pequeno text-primario underline">
            Leer la política de privacidad completa
          </a>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(e) => onAceptar(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primario"
            />
            <span className="estilo-cuerpo text-texto">{TEXTO_ACEPTACION}</span>
          </label>
        </section>
      )}

      <Boton tipo="whatsapp" disabled={(requiereAviso && !aceptado) || enviando} onClick={onSolicitar}>
        Solicitar cotización
      </Boton>
    </>
  )
}

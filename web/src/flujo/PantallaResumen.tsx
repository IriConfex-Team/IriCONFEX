import { formatoTelefono, type ConfiguracionCategoria, type EstadoFlujo, type EstadoPaso, type Negocio } from '@iriconfex/shared'
import { useId } from 'react'
import { Boton } from '../components/ui'
import { formatColones } from '../lib/formatColones'
import type { Contacto } from './PantallaContacto'
import { avisoDatos, TEXTO_ACEPTACION } from './textosDatos'
// ✅ NUEVO: Importamos la función desde el SelectorEntrega
import { formatearValorEntrega } from '../components/ui/SelectorEntrega'

export interface FilaResumen {
  id: string
  etiqueta: string
  valor: string
  /** Sin valor: no se puede cambiar (opción fijada). */
  onCambiar?: () => void
}

export interface GrupoResumen {
  titulo: string
  filas: FilaResumen[]
}

type Fila = FilaResumen

/** Agrupa los pasos respondidos según `resumen.secciones`; lo que no está en ninguna sección va al final. */
function agrupar(
  configuracion: ConfiguracionCategoria,
  estado: EstadoFlujo,
  onEditarPaso: (id: string) => void,
  despuesDe: Readonly<Record<string, FilaResumen[]>> = {},
): GrupoResumen[] {
  const respondidos = estado.pasos.filter((e) => e.valor !== undefined)

  // ✅ NUEVO: Formatea el valor del paso. Si es envío, usa la función de SelectorEntrega.
  const formatearValorPaso = (e: EstadoPaso): string => {
    if (e.paso.id === 'entrega') {
      const formateado = formatearValorEntrega(e.valor)
      if (formateado) return formateado
    }
    // Si es un color, formateamos su valor especial
    if (e.paso.id === 'color-superior' || e.paso.id === 'color-inferior') {
      return formatearColorResumen(e.valor)
    }
    // Para el resto, buscamos el nombre de la opción
    return e.paso.opciones.find((o) => o.id === e.valor)?.nombre ?? e.valor ?? ''
  }

  const fila = (e: EstadoPaso): Fila => ({
    id: e.paso.id,
    etiqueta: e.paso.nombre,
    valor: formatearValorPaso(e),
    onCambiar: e.fijada ? undefined : () => onEditarPaso(e.paso.id),
  })

  const secciones = configuracion.resumen?.secciones ?? []
  const usados = new Set(secciones.flatMap((s) => s.pasos))
  const grupos = secciones
    .map((s) => ({
      titulo: s.titulo,
      filas: s.pasos.flatMap((id) => respondidos.filter((e) => e.paso.id === id)).flatMap((e) => [fila(e), ...(despuesDe[e.paso.id] ?? [])]),
    }))
    .filter((g) => g.filas.length > 0)
  const otros = respondidos.filter((e) => !usados.has(e.paso.id)).flatMap((e) => [fila(e), ...(despuesDe[e.paso.id] ?? [])])
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
  /** Filas que van justo después de la de un paso (p. ej. el color de una tela, HU-12a). */
  despuesDe?: Readonly<Record<string, FilaResumen[]>>
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
  despuesDe,
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
      {agrupar(configuracion, estado, onEditarPaso, despuesDe).map((g) => (
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
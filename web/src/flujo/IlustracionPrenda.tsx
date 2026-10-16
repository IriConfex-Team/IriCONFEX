import type { Ilustracion } from '@iriconfex/shared'
import { useEffect, useId, useState, type CSSProperties } from 'react'
import { cx } from '../lib/cx'

/** Grupos de cada capa SVG según su `data-rol` (ver public/ilustraciones/LEEME.md). */
interface CapaSvg {
  sumas: string
  restas: string
  tapa: string
  lineas: string
  recortado: string
  detalle: string
}

const capaVacia: CapaSvg = { sumas: '', restas: '', tapa: '', lineas: '', recortado: '', detalle: '' }
const cache = new Map<string, Promise<CapaSvg>>()

function grupos(documento: Document, rol: string): string {
  return [...documento.querySelectorAll(`g[data-rol="${rol}"]`)].map((g) => g.innerHTML).join('')
}

function estiloDeGrupos(documento: Document, rol: string): string {
  // Conserva los atributos de trazo del grupo (stroke, fill="none"…) envolviendo su contenido.
  return [...documento.querySelectorAll(`g[data-rol="${rol}"]`)]
    .map((g) => {
      const atributos = [...g.attributes]
        .filter((a) => a.name !== 'data-rol')
        .map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`)
        .join(' ')
      return `<g ${atributos}>${g.innerHTML}</g>`
    })
    .join('')
}

/** Los SVG son recursos propios; aun así se quitan scripts y manejadores antes de insertarlos. */
function limpiar(documento: Document) {
  documento.querySelectorAll('script, foreignObject').forEach((n) => n.remove())
  documento.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) if (a.name.toLowerCase().startsWith('on')) n.removeAttribute(a.name)
  })
}

function cargarCapa(url: string): Promise<CapaSvg> {
  let promesa = cache.get(url)
  if (!promesa) {
    promesa = fetch(url)
      .then((respuesta) => (respuesta.ok ? respuesta.text() : Promise.reject(new Error(respuesta.statusText))))
      .then((texto) => {
        const documento = new DOMParser().parseFromString(texto, 'image/svg+xml')
        limpiar(documento)
        return {
          sumas: grupos(documento, 'silueta-suma'),
          restas: grupos(documento, 'silueta-resta'),
          tapa: estiloDeGrupos(documento, 'tapa'),
          lineas: estiloDeGrupos(documento, 'lineas'),
          recortado: estiloDeGrupos(documento, 'recortado-por-silueta'),
          detalle: estiloDeGrupos(documento, 'detalle'),
        }
      })
      .catch(() => capaVacia)
    cache.set(url, promesa)
  }
  return promesa
}

/** Une las capas de una pieza: silueta (sumas − restas) como máscara del color, y encima las líneas. */
function armarPieza(capas: CapaSvg[], mascara: string, ancho: number, alto: number): string {
  const sumas = capas.map((c) => c.sumas).join('')
  const restas = capas.map((c) => c.restas).join('')
  const encima = capas.map((c) => `${c.tapa}${c.lineas}<g mask="url(#${mascara})">${c.recortado}</g>${c.detalle}`).join('')
  return (
    `<defs><mask id="${mascara}" maskUnits="userSpaceOnUse" x="0" y="0" width="${ancho}" height="${alto}">` +
    `<g fill="#fff">${sumas}</g><g fill="#000">${restas}</g></mask></defs>` +
    `<rect width="${ancho}" height="${alto}" mask="url(#${mascara})" style="fill:var(--ilus-color)"/>` +
    encima
  )
}

export interface IlustracionPrendaProps {
  ilustracion: Ilustracion | null
  /** Color de la tela (HU-12a). Sin elegir: gris neutro. */
  color?: string
  /** Texto alternativo; vacío si la imagen es decorativa. */
  descripcion?: string
  className?: string
}

/** Dibuja la prenda superponiendo las capas que indica la configuración. No sabe qué prenda es. */
export function IlustracionPrenda({ ilustracion, color, descripcion, className }: IlustracionPrendaProps) {
  const prefijo = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [marcado, setMarcado] = useState<{ clave: string; html: string } | null>(null)
  const clave = JSON.stringify(ilustracion)

  useEffect(() => {
    if (!ilustracion) return
    let vigente = true
    Promise.all(
      ilustracion.piezas.map(async (pieza, i) => {
        const capas = await Promise.all(pieza.archivos.map(cargarCapa))
        const contenido = armarPieza(capas, `${prefijo}-m${i}`, pieza.ancho, pieza.alto)
        return `<g transform="translate(0 ${pieza.desplazamiento})">${contenido}</g>`
      }),
    ).then((piezas) => {
      if (vigente) setMarcado({ clave, html: piezas.join('') })
    })
    return () => {
      vigente = false
    }
    // `clave` resume `ilustracion`; así no se vuelve a armar con cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, prefijo])

  if (!ilustracion) return null
  const estilo = {
    '--ilus-color': color ?? 'var(--color-ilus-sin-color)',
    '--ilus-line': 'var(--color-ilus-linea-oscura)',
  } as CSSProperties

  return (
    <svg
      viewBox={`0 0 ${ilustracion.ancho} ${ilustracion.alto}`}
      preserveAspectRatio="xMidYMid meet"
      role={descripcion ? 'img' : undefined}
      aria-label={descripcion || undefined}
      aria-hidden={descripcion ? undefined : true}
      className={cx('block', className)}
      style={estilo}
      dangerouslySetInnerHTML={marcado?.clave === clave ? { __html: marcado.html } : undefined}
    />
  )
}

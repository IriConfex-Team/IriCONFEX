import type { ConfiguracionCategoria } from '@iriconfex/shared'
import { ImagenCategoria, PaginaSitio } from './PaginaSitio'

export interface CategoriasProps {
  /** Las categorías con configuración cargada (HU-01 CA2): cada archivo de datos/categorias es una. */
  configuraciones: readonly ConfiguracionCategoria[]
  onElegir: (categoria: string) => void
  onAtras: () => void
}

/** Figma 10 · A02 / A03: una tarjeta por categoría; al tocarla empieza su flujo (HU-01 CA4). */
export function Categorias({ configuraciones, onElegir, onAtras }: CategoriasProps) {
  return (
    <PaginaSitio negocio={configuraciones[0]?.negocio} onAtras={onAtras}>
      <h1 className="m-0 estilo-titulo-1 text-texto">¿Qué quieres diseñar?</h1>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {configuraciones.map((configuracion) => {
          const { id, nombre, tarjeta } = configuracion.categoria
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onElegir(id)}
                className="flex w-full cursor-pointer flex-col overflow-hidden rounded-tarjeta border border-borde bg-superficie p-0 text-left shadow-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primario active:bg-superficie-beige"
              >
                <ImagenCategoria configuracion={configuracion} className="h-44" />
                <span className="flex items-center gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="estilo-titulo-2 text-texto">{tarjeta?.titulo ?? nombre}</span>
                    {tarjeta?.descripcion && (
                      <span className="estilo-pequeno text-texto-secundario">{tarjeta.descripcion}</span>
                    )}
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 text-primario">
                    <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {configuraciones.length === 1 && (
        <p className="m-0 estilo-pequeno text-texto-secundario">Pronto podrás diseñar otras prendas.</p>
      )}
    </PaginaSitio>
  )
}

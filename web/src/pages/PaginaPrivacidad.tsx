import type { Negocio } from '@iriconfex/shared'
import { politicaPrivacidad } from '../flujo/textosDatos'

/** Política completa enlazada desde el aviso de datos (HU-20 CA1). */
export function PaginaPrivacidad({ negocio }: { negocio: Negocio }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 bg-fondo px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="m-0 estilo-etiqueta text-primario">{negocio.nombre}</p>
        <h1 className="m-0 estilo-titulo-1 text-texto">Política de privacidad</h1>
      </div>
      {politicaPrivacidad(negocio).map((seccion) => (
        <section key={seccion.titulo} className="flex flex-col gap-2">
          <h2 className="m-0 estilo-titulo-3 text-texto">{seccion.titulo}</h2>
          {seccion.parrafos.map((parrafo) => (
            <p key={parrafo} className="m-0 estilo-cuerpo text-texto">
              {parrafo}
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}

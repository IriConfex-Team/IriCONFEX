import {
  elegir,
  evaluarFlujo,
  iniciarSeleccion,
  textoEncabezado,
  type ConfiguracionCategoria,
  type Conflicto,
  type EstadoPaso,
  type Opcion,
} from '@iriconfex/shared'
import { useMemo, useState } from 'react'
import {
  AvisoEnLinea,
  BarraInferiorFija,
  Boton,
  EncabezadoFlujo,
  RejillaOpciones,
  SelectorSiNo,
  TarjetaOpcion,
} from '../components/ui'

export interface FlujoConfiguracionProps {
  configuracion: ConfiguracionCategoria
}

/**
 * Vista genérica del flujo (HU-23 CA2): muestra el siguiente paso visible, sus opciones válidas y las fijaciones.
 * No conoce ninguna prenda; todo sale de la configuración.
 */
export function FlujoConfiguracion({ configuracion }: FlujoConfiguracionProps) {
  const [seleccion, setSeleccion] = useState(() => iniciarSeleccion(configuracion))
  const [pasoActualId, setPasoActualId] = useState(configuracion.pasos[0].id)
  const [aviso, setAviso] = useState<string | null>(null)
  const [terminado, setTerminado] = useState(false)

  const estado = useMemo(() => evaluarFlujo(configuracion, seleccion), [configuracion, seleccion])
  const indice = Math.max(
    0,
    estado.pasos.findIndex((e) => e.paso.id === pasoActualId),
  )
  const actual = estado.pasos[indice]
  const nombreDelPaso = (id: string) => configuracion.pasos.find((p) => p.id === id)?.nombre ?? id

  const irA = (pasoId: string) => {
    setPasoActualId(pasoId)
    setAviso(null)
    setTerminado(false)
  }

  const alElegir = (opcionId: string) => {
    const resultado = elegir(configuracion, seleccion, actual.paso.id, opcionId)
    setSeleccion(resultado.seleccion)
    if (resultado.reiniciado) setAviso('Se reinició la configuración.')
    else if (resultado.limpiados.length > 0) {
      setAviso(
        `Se borró lo que elegiste en ${resultado.limpiados.map((id) => `«${nombreDelPaso(id)}»`).join(', ')} porque ya no aplica.`,
      )
    } else setAviso(null)
  }

  const alSiguiente = () => {
    const siguiente = estado.pasos[indice + 1]
    if (siguiente) irA(siguiente.paso.id)
    else {
      setAviso(null)
      setTerminado(true)
    }
  }

  const alAtras = () => {
    if (terminado) setTerminado(false)
    else if (indice > 0) irA(estado.pasos[indice - 1].paso.id)
  }

  const encabezado = configuracion.encabezado
  const puedeSeguir = actual.valor !== undefined && estado.conflictos.length === 0

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-fondo">
      <EncabezadoFlujo
        perfil={textoEncabezado(configuracion, seleccion)}
        paso={terminado ? 'Revisa tu elección' : actual.paso.nombre}
        pasoActual={terminado ? estado.pasos.length : indice + 1}
        totalPasos={estado.pasos.length}
        onAtras={alAtras}
        onCambiarPerfil={encabezado ? () => irA(encabezado.paso) : undefined}
      />

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        {terminado ? (
          <Resumen pasos={estado.pasos} onEditar={irA} />
        ) : (
          <>
            {aviso && <AvisoEnLinea tipo="aviso">{aviso}</AvisoEnLinea>}
            <Conflictos conflictos={estado.conflictos} pasoActual={actual.paso.id} nombreDelPaso={nombreDelPaso} onIr={irA} />
            {actual.paso.nota && <AvisoEnLinea>{actual.paso.nota}</AvisoEnLinea>}
            <Paso estado={actual} onElegir={alElegir} />
          </>
        )}
      </main>

      {!terminado && (
        <BarraInferiorFija
          className="sticky bottom-0"
          deshabilitada={!puedeSeguir}
          textoBoton={indice === estado.pasos.length - 1 ? 'Revisar' : 'Siguiente'}
          onSiguiente={alSiguiente}
        />
      )}
    </div>
  )
}

function Paso({ estado, onElegir }: { estado: EstadoPaso; onElegir: (opcionId: string) => void }) {
  const { paso, fijada, opciones, valor } = estado

  if (fijada) {
    const opcion = paso.opciones.find((o) => o.id === fijada.opcion)
    return (
      <>
        {fijada.mensaje && <AvisoEnLinea>{fijada.mensaje}</AvisoEnLinea>}
        <RejillaOpciones etiqueta={paso.nombre}>
          {opcion && <TarjetaOpcion nombre={opcion.nombre} ilustracion={<Imagen opcion={opcion} />} seleccionada />}
        </RejillaOpciones>
      </>
    )
  }

  if (paso.presentacion === 'si-no') {
    return (
      <SelectorSiNo
        etiqueta={paso.nombre}
        valor={valor === undefined ? null : valor === 'si'}
        onCambiar={(si) => onElegir(si ? 'si' : 'no')}
      />
    )
  }

  return (
    <RejillaOpciones etiqueta={paso.nombre}>
      {opciones.map((opcion) => (
        <TarjetaOpcion
          key={opcion.id}
          nombre={opcion.nombre}
          ilustracion={<Imagen opcion={opcion} />}
          seleccionada={valor === opcion.id}
          onSeleccionar={() => onElegir(opcion.id)}
        />
      ))}
    </RejillaOpciones>
  )
}

function Imagen({ opcion }: { opcion: Opcion }) {
  return opcion.imagen ? <img src={opcion.imagen} alt="" className="h-full w-full object-contain" loading="lazy" /> : null
}

/** Una elección posterior contradice otra anterior (HU-06 CA7): se explica y se ofrece cambiarla. */
function Conflictos({
  conflictos,
  pasoActual,
  nombreDelPaso,
  onIr,
}: {
  conflictos: Conflicto[]
  pasoActual: string
  nombreDelPaso: (id: string) => string
  onIr: (pasoId: string) => void
}) {
  const mensajes = [...new Set(conflictos.map((c) => c.mensaje ?? 'Hay una elección que ya no es compatible.'))]
  const pasos = [...new Set(conflictos.map((c) => c.paso))].filter((id) => id !== pasoActual)
  if (mensajes.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {mensajes.map((mensaje) => (
        <AvisoEnLinea key={mensaje} tipo="aviso">
          {mensaje}
        </AvisoEnLinea>
      ))}
      {pasos.map((id) => (
        <Boton key={id} tipo="secundario" onClick={() => onIr(id)}>
          Cambiar {nombreDelPaso(id).toLowerCase()}
        </Boton>
      ))}
    </div>
  )
}

/** Resumen provisional hasta HU-21. */
function Resumen({ pasos, onEditar }: { pasos: EstadoPaso[]; onEditar: (pasoId: string) => void }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {pasos.map(({ paso, valor }) => (
          <li key={paso.id} className="flex items-center justify-between gap-3 rounded-campo bg-superficie px-4 py-3 shadow-1">
            <span className="flex flex-col">
              <span className="estilo-pequeno text-texto-secundario">{paso.nombre}</span>
              <span className="estilo-cuerpo-fuerte text-texto">{paso.opciones.find((o) => o.id === valor)?.nombre}</span>
            </span>
            <button
              type="button"
              onClick={() => onEditar(paso.id)}
              aria-label={`Cambiar ${paso.nombre}`}
              className="cursor-pointer estilo-cuerpo-fuerte text-primario underline"
            >
              cambiar
            </button>
          </li>
        ))}
    </ul>
  )
}

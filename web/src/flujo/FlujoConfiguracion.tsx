import {
  elegir,
  evaluarFlujo,
  ilustrar,
  ilustrarOpcion,
  iniciarSeleccion,
  mismaIlustracion,
  textoEncabezado,
  type ConfiguracionCategoria,
  type Conflicto,
  type EstadoPaso,
  type Ilustracion,
  type Opcion,
  type Seleccion,
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
import { cx } from '../lib/cx'
import { encuadrar, unirCajas, type Caja } from './encuadre'
import { IlustracionPrenda } from './IlustracionPrenda'

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
          <>
            <VistaPrenda ilustracion={ilustrar(configuracion, seleccion)} grande />
            <Resumen pasos={estado.pasos} onEditar={irA} />
          </>
        ) : (
          <>
            {aviso && <AvisoEnLinea tipo="aviso">{aviso}</AvisoEnLinea>}
            <Conflictos conflictos={estado.conflictos} pasoActual={actual.paso.id} nombreDelPaso={nombreDelPaso} onIr={irA} />
            {actual.paso.nota && <AvisoEnLinea>{actual.paso.nota}</AvisoEnLinea>}
            <Paso configuracion={configuracion} seleccion={seleccion} estado={actual} onElegir={alElegir} />
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

interface PasoProps {
  configuracion: ConfiguracionCategoria
  seleccion: Seleccion
  estado: EstadoPaso
  onElegir: (opcionId: string) => void
}

function Paso({ configuracion, seleccion, estado, onElegir }: PasoProps) {
  const { paso, fijada, opciones, valor } = estado

  // Cómo quedaría la prenda con cada opción. Si ninguna cambia el dibujo (p. ej. la talla), no se muestran.
  const vistas = useMemo(() => {
    const porOpcion = new Map(opciones.map((o) => [o.id, ilustrarOpcion(configuracion, seleccion, paso.id, o.id)]))
    const primera = porOpcion.get(opciones[0]?.id)
    const cambian = [...porOpcion.values()].some((vista) => !mismaIlustracion(vista, primera ?? null))
    return cambian ? porOpcion : null
  }, [configuracion, seleccion, paso.id, opciones])
  const vista = useEncuadreComun(paso.id, vistas)

  if (fijada) {
    const opcion = paso.opciones.find((o) => o.id === fijada.opcion)
    return (
      <>
        {fijada.mensaje && <AvisoEnLinea>{fijada.mensaje}</AvisoEnLinea>}
        <RejillaOpciones etiqueta={paso.nombre}>
          {opcion && (
            <TarjetaOpcion
              nombre={opcion.nombre}
              ilustracion={<Miniatura opcion={opcion} ilustracion={ilustrar(configuracion, seleccion)} />}
              seleccionada
            />
          )}
        </RejillaOpciones>
      </>
    )
  }

  if (paso.presentacion === 'si-no') {
    return (
      <>
        <VistaPrenda ilustracion={ilustrar(configuracion, seleccion)} />
        <SelectorSiNo
          etiqueta={paso.nombre}
          valor={valor === undefined ? null : valor === 'si'}
          onCambiar={(si) => onElegir(si ? 'si' : 'no')}
        />
      </>
    )
  }

  return (
    <RejillaOpciones etiqueta={paso.nombre}>
      {opciones.map((opcion) => (
        <TarjetaOpcion
          key={opcion.id}
          nombre={opcion.nombre}
          ilustracion={
            <Miniatura
              opcion={opcion}
              ilustracion={vistas?.get(opcion.id) ?? null}
              enfoque={vista.enfoque}
              onMedir={vista.medidores.get(opcion.id)}
              vista={vista.caja}
            />
          }
          seleccionada={valor === opcion.id}
          onSeleccionar={() => onElegir(opcion.id)}
        />
      ))}
    </RejillaOpciones>
  )
}

/** Proporción del área de ilustración de la tarjeta (ancho / alto). */
const PROPORCION_TARJETA = 1.45

/**
 * Acerca las miniaturas de un paso a lo que cambia entre sus opciones (p. ej. el escote), con el mismo encuadre
 * para todas las tarjetas, para que se puedan comparar. Se calcula con las capas que no son comunes a todas.
 */
function useEncuadreComun(pasoId: string, vistas: Map<string, Ilustracion | null> | null) {
  const { clave, enfoque } = useMemo(() => {
    if (!vistas) return { clave: '', enfoque: undefined }
    const listas = [...vistas.values()].map((v) => new Set(v?.piezas.flatMap((p) => p.archivos) ?? []))
    const todas = new Set(listas.flatMap((l) => [...l]))
    const distintas = new Set([...todas].filter((url) => !listas.every((l) => l.has(url))))
    return distintas.size > 0
      ? { clave: `${pasoId}|${[...distintas].sort().join()}`, enfoque: distintas as ReadonlySet<string> }
      : { clave: '', enfoque: undefined }
  }, [pasoId, vistas])

  const [medidas, setMedidas] = useState<{ clave: string; cajas: Map<string, Caja | null> }>({ clave: '', cajas: new Map() })

  const medidores = useMemo(() => {
    const mapa = new Map<string, (caja: Caja | null) => void>()
    for (const id of vistas?.keys() ?? []) {
      mapa.set(id, (caja) =>
        setMedidas((previas) => {
          const cajas = new Map(previas.clave === clave ? previas.cajas : [])
          cajas.set(id, caja)
          return { clave, cajas }
        }),
      )
    }
    return mapa
  }, [vistas, clave])

  // Solo cuando todas las tarjetas se midieron, para que no salte el encuadre mientras cargan.
  const completas = vistas !== null && enfoque !== undefined && medidas.clave === clave && medidas.cajas.size >= vistas.size
  const medidasValidas = completas ? [...medidas.cajas.values()].filter((c): c is Caja => c !== null) : []
  const caja = medidasValidas.length > 0 ? encuadrar(medidasValidas.reduce(unirCajas), PROPORCION_TARJETA) : null

  return { enfoque, medidores, caja }
}

interface MiniaturaProps {
  opcion: Opcion
  ilustracion: Ilustracion | null
  enfoque?: ReadonlySet<string>
  onMedir?: (caja: Caja | null) => void
  vista?: Caja | null
}

/** Fotografía de la opción si la configuración la trae (HU-06 CA4); si no, la prenda dibujada con esa opción. */
function Miniatura({ opcion, ilustracion, enfoque, onMedir, vista }: MiniaturaProps) {
  if (opcion.imagen) return <img src={opcion.imagen} alt="" className="h-full w-full object-contain" loading="lazy" />
  return (
    <IlustracionPrenda
      ilustracion={ilustracion}
      enfoque={enfoque}
      onMedir={onMedir}
      vista={vista}
      className={vista ? 'h-full w-full' : 'h-full w-full py-2'}
    />
  )
}

/** La prenda armada hasta ahora, siempre sobre lienzo neutro. */
function VistaPrenda({ ilustracion, grande = false }: { ilustracion: Ilustracion | null; grande?: boolean }) {
  if (!ilustracion) return null
  return (
    <div className={cx('flex items-center justify-center rounded-tarjeta bg-lienzo', grande ? 'h-80 py-4' : 'h-48 py-3')}>
      <IlustracionPrenda ilustracion={ilustracion} descripcion="Vista previa de tu elección" className="h-full w-full" />
    </div>
  )
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

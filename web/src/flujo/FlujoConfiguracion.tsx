import {
  camposQueAplican,
  elegir,
  evaluarFlujo,
  formatoNumero,
  guiaDelPaso,
  ilustrar,
  ilustrarOpcion,
  iniciarSeleccion,
  mismaIlustracion,
  normalizarTelefono,
  parteDelPaso,
  pasosQueDibujan,
  pideMedidas,
  revisarMedidasEscritas,
  textoEncabezado,
  validarContacto,
  type ConfiguracionCategoria,
  type Conflicto,
  type EstadoPaso,
  type Ilustracion,
  type Negocio,
  type Opcion,
  type Seleccion,
  type SolicitudCotizacion,
} from '@iriconfex/shared'
import { useEffect, useMemo, useState } from 'react'
import {
  AvisoEnLinea,
  BarraInferiorFija,
  Boton,
  EncabezadoFlujo,
  ListaOpciones,
  RejillaOpciones,
  SelectorSiNo,
  TarjetaOpcion,
  TarjetaOpcionDetallada,
  type TipoAviso,
} from '../components/ui'
import { cx } from '../lib/cx'
import { ErrorApi, type RespuestaSolicitud } from '../api/cliente'
import { encuadrar, unirCajas, type Caja } from './encuadre'
import { EncabezadoParte, GuiaDeOpciones } from './GuiasDelPaso'
import { IlustracionPrenda } from './IlustracionPrenda'
import { HojaInfoLocal, TarjetaInfoLocal } from './InfoLocal'
import { PantallaContacto, type Contacto } from './PantallaContacto'
import { PantallaMedidas, type MedidasEscritas } from './PantallaMedidas'
import { PantallaResumen, type GrupoResumen } from './PantallaResumen'
import { SolicitudEnviada } from './SolicitudEnviada'
import { VistaPrenda } from './VistaPrenda'

export interface FlujoConfiguracionProps {
  configuracion: ConfiguracionCategoria
  /** Envía la solicitud a la API (HU-22, HU-25). Sin valor, la solicitud queda lista pero no se envía. */
  onSolicitar?: (solicitud: SolicitudCotizacion) => Promise<RespuestaSolicitud | void>
  /** «Atrás» en el primer paso: salir del flujo (p. ej. a la lista de categorías). */
  onSalir?: () => void
}

/** Después de los pasos de la configuración: datos de contacto (HU-19) y resumen con el aviso (HU-20, HU-21). */
type Fase = 'configurar' | 'contacto' | 'resumen' | 'enviada'

/** HU-22: texto para el cliente según lo que respondió la API. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    if (error.codigo === 'DEMASIADAS_SOLICITUDES') {
      return 'Enviaste varias solicitudes seguidas. Espera unos minutos e inténtalo de nuevo.'
    }
    if (error.codigo === 'VALIDACION' || error.codigo === 'SELECCION_INVALIDA') {
      return 'Hay un dato que no es válido. Revisa tus elecciones y tus datos de contacto.'
    }
    if (error.codigo === 'SIN_CONEXION') return error.message
  }
  return 'No se pudo enviar la solicitud. Intenta de nuevo en unos minutos.'
}

/** Lugar de la pantalla de medidas propias (HU-14) en el recorrido; no es un paso de la configuración. */
const PANTALLA_MEDIDAS = '#medidas'

/**
 * Vista genérica del flujo (HU-23 CA2): muestra el siguiente paso visible, sus opciones válidas y las fijaciones.
 * No conoce ninguna prenda; todo sale de la configuración.
 */
export function FlujoConfiguracion({ configuracion, onSolicitar, onSalir }: FlujoConfiguracionProps) {
  const [seleccion, setSeleccion] = useState(() => iniciarSeleccion(configuracion))
  const [pasoActualId, setPasoActualId] = useState(configuracion.pasos[0].id)
  const [aviso, setAviso] = useState<string | null>(null)
  const [fase, setFase] = useState<Fase>('configurar')
  const [vieneDelResumen, setVieneDelResumen] = useState(false)
  const [contacto, setContacto] = useState<Contacto>({ nombre: '', telefono: '' })
  const [intentoContacto, setIntentoContacto] = useState(false)
  const [aceptado, setAceptado] = useState(false)
  const [infoAbierta, setInfoAbierta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [respuesta, setRespuesta] = useState<RespuestaSolicitud | null>(null)
  const [avisoEnvio, setAvisoEnvio] = useState<{ tipo: TipoAviso; texto: string } | null>(null)
  const [medidasEscritas, setMedidasEscritas] = useState<MedidasEscritas>({})
  const [intentoMedidas, setIntentoMedidas] = useState(false)

  // Cada paso, la pantalla de contacto y el resumen empiezan arriba, aunque el anterior se haya bajado.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pasoActualId, fase])

  const negocio = configuracion.negocio
  const estado = useMemo(() => evaluarFlujo(configuracion, seleccion), [configuracion, seleccion])

  // Los pasos visibles y, si la selección las pide, la pantalla de medidas antes del paso indicado.
  const conMedidas = pideMedidas(configuracion, seleccion)
  const recorrido = estado.pasos.map((e) => e.paso.id)
  if (conMedidas && configuracion.medidas) {
    const antes = recorrido.indexOf(configuracion.medidas.antesDe)
    recorrido.splice(antes < 0 ? recorrido.length : antes, 0, PANTALLA_MEDIDAS)
  }
  const indice = Math.max(0, recorrido.indexOf(pasoActualId))
  const enMedidas = recorrido[indice] === PANTALLA_MEDIDAS
  const actual = estado.pasos.find((e) => e.paso.id === recorrido[indice])
  const total = recorrido.length
  const revisionMedidas = revisarMedidasEscritas(configuracion, seleccion, medidasEscritas)
  const medidasCompletas = !conMedidas || Object.keys(revisionMedidas.errores).length === 0
  const nombreDelPaso = (id: string) => configuracion.pasos.find((p) => p.id === id)?.nombre ?? id

  const irA = (pasoId: string) => {
    setPasoActualId(pasoId)
    setAviso(null)
    setFase('configurar')
  }

  const editarDesdeResumen = (pasoId: string) => {
    setVieneDelResumen(true)
    irA(pasoId)
  }

  const alElegir = (opcionId: string) => {
    if (!actual) return
    const resultado = elegir(configuracion, seleccion, actual.paso.id, opcionId)
    setSeleccion(resultado.seleccion)
    setAvisoEnvio(null)
    if (resultado.reiniciado) setAviso('Se reinició la configuración.')
    else if (resultado.limpiados.length > 0) {
      setAviso(
        `Se borró lo que elegiste en ${resultado.limpiados.map((id) => `«${nombreDelPaso(id)}»`).join(', ')} porque ya no aplica.`,
      )
    } else setAviso(null)
  }

  const irAlResumen = () => {
    // Si algo quedó sin responder (p. ej. tras cambiar una elección), se vuelve a ese paso.
    const pendiente = estado.pasos.find((e) => e.valor === undefined || e.conflictos.length > 0)
    if (pendiente) irA(pendiente.paso.id)
    else if (!medidasCompletas) {
      setIntentoMedidas(true)
      irA(PANTALLA_MEDIDAS)
    } else {
      setVieneDelResumen(false)
      setFase('resumen')
    }
  }

  const alSiguiente = () => {
    if (fase === 'contacto') {
      if (Object.keys(validarContacto(contacto)).length > 0) setIntentoContacto(true)
      else irAlResumen()
      return
    }
    if (enMedidas && !medidasCompletas) {
      setIntentoMedidas(true)
      // Lleva al primer campo con error, que puede estar fuera de la pantalla.
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus())
      return
    }
    const siguiente = recorrido[indice + 1]
    if (siguiente) irA(siguiente)
    else {
      setAviso(null)
      setFase('contacto')
    }
  }

  const alAtras = () => {
    if (fase === 'enviada') return // ya se envió: volver permitiría duplicar la solicitud
    if (fase === 'resumen') setFase('contacto')
    else if (fase === 'contacto') irA(recorrido[total - 1])
    else if (indice > 0) irA(recorrido[indice - 1])
    else onSalir?.()
  }

  const alSolicitar = async () => {
    const solicitud: SolicitudCotizacion = {
      categoria: configuracion.categoria.id,
      seleccion,
      ...(conMedidas && { medidas: revisionMedidas.medidas }),
      contacto: { nombre: contacto.nombre.trim(), telefono: normalizarTelefono(contacto.telefono) },
      consentimiento: { aceptado: true, fecha: new Date().toISOString() },
    }
    if (!onSolicitar) {
      setAvisoEnvio({
        tipo: 'info',
        texto: 'Tu solicitud está lista. El envío por WhatsApp se activará cuando el servidor esté conectado.',
      })
      return
    }
    if (enviando) return
    setEnviando(true)
    setAvisoEnvio({ tipo: 'info', texto: 'Enviando… si el servidor estaba dormido puede tardar hasta un minuto.' })
    try {
      const resultado: RespuestaSolicitud | void = await onSolicitar(solicitud)
      if (resultado) {
        setRespuesta(resultado)
        setAvisoEnvio(null)
        setFase('enviada')
      } else {
        setAvisoEnvio({ tipo: 'exito', texto: 'Listo: tu solicitud de cotización se envió.' })
      }
    } catch (error) {
      setAvisoEnvio({ tipo: 'error', texto: mensajeDeError(error) })
    } finally {
      setEnviando(false)
    }
  }

  const encabezado = configuracion.encabezado
  const puedeSeguir =
    fase === 'contacto' || ((enMedidas || actual?.valor !== undefined) && estado.conflictos.length === 0)
  const parteActual = actual ? parteDelPaso(actual.paso, seleccion) : undefined
  const guiaActual = actual ? guiaDelPaso(actual.paso, seleccion, actual.opciones) : undefined
  const tituloPaso = enMedidas ? (configuracion.medidas?.titulo ?? '') : (actual?.paso.nombre ?? '')
  const tituloFase = {
    configurar: tituloPaso,
    contacto: 'Tus datos',
    resumen: 'Revisa tu solicitud',
    enviada: 'Solicitud lista',
  }[fase]
  const numeroFase = { configurar: indice + 1, contacto: total + 1, resumen: total + 2, enviada: total + 2 }[fase]

  // HU-14 CA6 y HU-21: las medidas también se revisan y se cambian desde el resumen.
  const medidasResumen: GrupoResumen | undefined =
    conMedidas && configuracion.medidas
      ? {
          titulo: configuracion.medidas.titulo,
          filas: camposQueAplican(configuracion, seleccion)
            .flatMap((g) => g.campos)
            .map((campo) => ({
              id: campo.id,
              etiqueta: campo.nombre,
              valor: `${formatoNumero(revisionMedidas.medidas[campo.id] ?? 0)} ${configuracion.medidas?.unidad ?? ''}`.trim(),
              onCambiar: () => editarDesdeResumen(PANTALLA_MEDIDAS),
            })),
        }
      : undefined

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-fondo">
      <EncabezadoFlujo
        perfil={textoEncabezado(configuracion, seleccion)}
        paso={tituloFase}
        pasoActual={numeroFase}
        totalPasos={total + 2}
        onAtras={alAtras}
        onCambiarPerfil={encabezado ? () => irA(encabezado.paso) : undefined}
        onInfoLocal={negocio ? () => setInfoAbierta(true) : undefined}
      />

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        {fase === 'resumen' && (
          <>
            <VistaPrenda ilustracion={ilustrar(configuracion, seleccion)} grande />
            <PantallaResumen
              configuracion={configuracion}
              estado={estado}
              contacto={contacto}
              medidas={medidasResumen}
              negocio={negocio}
              aceptado={aceptado}
              onAceptar={setAceptado}
              onEditarPaso={editarDesdeResumen}
              onEditarContacto={() => setFase('contacto')}
              onSolicitar={alSolicitar}
              enviando={enviando}
            />
            {avisoEnvio && <AvisoEnLinea tipo={avisoEnvio.tipo}>{avisoEnvio.texto}</AvisoEnLinea>}
          </>
        )}
        {fase === 'contacto' && (
          <PantallaContacto contacto={contacto} onCambiar={setContacto} mostrarErrores={intentoContacto} />
        )}
        {fase === 'enviada' && respuesta && <SolicitudEnviada respuesta={respuesta} />}
        {fase === 'configurar' && (
          <>
            {parteActual && <EncabezadoParte parte={parteActual} ilustracion={ilustrar(configuracion, seleccion)} />}
            {aviso && <AvisoEnLinea tipo="aviso">{aviso}</AvisoEnLinea>}
            <Conflictos conflictos={estado.conflictos} pasoActual={recorrido[indice]} nombreDelPaso={nombreDelPaso} onIr={irA} />
            {enMedidas && (
              <PantallaMedidas
                configuracion={configuracion}
                seleccion={seleccion}
                valores={medidasEscritas}
                onCambiar={setMedidasEscritas}
                mostrarErrores={intentoMedidas}
              />
            )}
            {actual?.paso.nota && <AvisoEnLinea>{actual.paso.nota}</AvisoEnLinea>}
            {actual && (
              <Paso configuracion={configuracion} seleccion={seleccion} estado={actual} negocio={negocio} onElegir={alElegir} />
            )}
            {actual && guiaActual && <GuiaDeOpciones guia={guiaActual} elegida={actual.fijada?.opcion ?? actual.valor} />}
            {vieneDelResumen && estado.completo && medidasCompletas && (
              <Boton tipo="secundario" onClick={irAlResumen}>
                Volver al resumen
              </Boton>
            )}
          </>
        )}
      </main>

      {fase !== 'resumen' && fase !== 'enviada' && (
        <BarraInferiorFija
          className="sticky bottom-0"
          deshabilitada={!puedeSeguir}
          ayuda={estado.conflictos.length > 0 ? 'Resuelve el aviso para continuar.' : undefined}
          textoBoton={fase === 'contacto' ? 'Revisar' : 'Siguiente'}
          onSiguiente={alSiguiente}
        />
      )}

      {negocio && <HojaInfoLocal negocio={negocio} abierta={infoAbierta} onCerrar={() => setInfoAbierta(false)} />}
    </div>
  )
}

interface PasoProps {
  configuracion: ConfiguracionCategoria
  seleccion: Seleccion
  estado: EstadoPaso
  negocio?: Negocio
  onElegir: (opcionId: string) => void
}

/** Las opciones del paso y, si la elegida lo pide, la información del local (HU-15, HU-16). */
function Paso({ negocio, ...props }: PasoProps) {
  const { paso, fijada, valor } = props.estado
  const elegida = paso.opciones.find((o) => o.id === (fijada?.opcion ?? valor))
  return (
    <>
      <OpcionesDelPaso {...props} />
      {negocio && elegida?.muestraInfoLocal && <TarjetaInfoLocal negocio={negocio} />}
    </>
  )
}

function OpcionesDelPaso({ configuracion, seleccion, estado, onElegir }: Omit<PasoProps, 'negocio'>) {
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
              ilustracion={
                pasosQueDibujan(configuracion).has(paso.id) || opcion.imagen ? (
                  <Miniatura opcion={opcion} ilustracion={ilustrar(configuracion, seleccion)} />
                ) : undefined
              }
              seleccionada
            />
          )}
        </RejillaOpciones>
      </>
    )
  }

  if (paso.presentacion === 'si-no') {
    // Si la respuesta cambia el dibujo (p. ej. agregar una prenda), mientras no se responde se muestra el «sí»:
    // así se entiende qué se está preguntando.
    const muestraElSi = valor === undefined && pasosQueDibujan(configuracion).has(paso.id)
    return (
      <>
        <VistaPrenda
          ilustracion={
            muestraElSi ? ilustrarOpcion(configuracion, seleccion, paso.id, 'si') : ilustrar(configuracion, seleccion)
          }
          // Recuadro ancho y bajo: con la proporción del recuadro, un conjunto ancho (pijama + bata) se ve grande.
          proporcion={1.8}
        />
        {muestraElSi && (
          <p className="m-0 -mt-2 text-center estilo-pequeno text-texto-secundario">Así se vería si eliges «Sí».</p>
        )}
        <SelectorSiNo
          etiqueta={paso.nombre}
          valor={valor === undefined ? null : valor === 'si'}
          onCambiar={(si) => onElegir(si ? 'si' : 'no')}
        />
      </>
    )
  }

  if (paso.presentacion === 'lista') {
    return (
      <ListaOpciones etiqueta={paso.nombre}>
        {opciones.map((opcion) => (
          <TarjetaOpcionDetallada
            key={opcion.id}
            nombre={opcion.nombre}
            descripcion={opcion.descripcion}
            etiqueta={opcion.etiqueta}
            imagen={<Miniatura opcion={opcion} ilustracion={vistas?.get(opcion.id) ?? null} cubrir />}
            seleccionada={valor === opcion.id}
            onSeleccionar={() => onElegir(opcion.id)}
          />
        ))}
      </ListaOpciones>
    )
  }

  return (
    <RejillaOpciones etiqueta={paso.nombre}>
      {opciones.map((opcion) => (
        <TarjetaOpcion
          key={opcion.id}
          nombre={opcion.nombre}
          ilustracion={
            vistas || opcion.imagen ? (
              <Miniatura
                opcion={opcion}
                ilustracion={vistas?.get(opcion.id) ?? null}
                enfoque={vista.enfoque}
                onMedir={vista.medidores.get(opcion.id)}
                vista={vista.caja}
              />
            ) : undefined
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
  /** La foto llena el recuadro (lista) en lugar de ajustarse dentro. */
  cubrir?: boolean
}

/** Fotografía de la opción si la configuración la trae (HU-06 CA4); si no, la prenda dibujada con esa opción. */
function Miniatura({ opcion, ilustracion, enfoque, onMedir, vista, cubrir = false }: MiniaturaProps) {
  if (opcion.imagen) {
    return (
      <img
        src={opcion.imagen}
        alt=""
        className={cx('h-full w-full', cubrir ? 'object-cover' : 'object-contain')}
        loading="lazy"
      />
    )
  }
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

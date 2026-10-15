import { useState, type ReactNode } from 'react'
import {
  AvisoEnLinea,
  BarraInferiorFija,
  Boton,
  CampoMedida,
  ChipSeleccion,
  EncabezadoFlujo,
  RejillaOpciones,
  SelectorSiNo,
  TarjetaOpcion,
} from '../components/ui'

// Datos de muestra solo para la vista del sistema de diseño (T-04).
// El flujo real los obtiene de la configuración en la base de datos (HU-23, HU-24a).
const opcionesMuestra = [
  { id: 'a', nombre: 'Manga corta' },
  { id: 'b', nombre: 'Sin manga' },
  { id: 'c', nombre: 'Tirantes' },
  { id: 'd', nombre: 'Manga larga', deshabilitada: true },
]
const tallasMuestra = ['S', 'M', 'L', 'XL']

const colores = [
  ['primario', 'bg-primario'],
  ['primario-hover', 'bg-primario-hover'],
  ['primario-suave', 'bg-primario-suave'],
  ['primario-texto', 'bg-primario-texto'],
  ['fondo', 'bg-fondo'],
  ['superficie', 'bg-superficie'],
  ['superficie-beige', 'bg-superficie-beige'],
  ['lienzo', 'bg-lienzo'],
  ['borde', 'bg-borde'],
  ['borde-control', 'bg-borde-control'],
  ['texto', 'bg-texto'],
  ['texto-secundario', 'bg-texto-secundario'],
  ['exito', 'bg-exito'],
  ['aviso', 'bg-aviso'],
  ['error', 'bg-error'],
  ['whatsapp', 'bg-whatsapp'],
] as const

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 estilo-titulo-2 text-texto">{titulo}</h2>
      {children}
    </section>
  )
}

export function DesignPreview() {
  const [opcion, setOpcion] = useState('a')
  const [talla, setTalla] = useState('M')
  const [esNina, setEsNina] = useState<boolean | null>(null)
  const [medida, setMedida] = useState('')

  const valorMedida = Number(medida)
  const errorMedida =
    medida !== '' && (Number.isNaN(valorMedida) || valorMedida < 40 || valorMedida > 200)
      ? 'Escribe una medida entre 40 y 200 cm.'
      : undefined

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-fondo">
      <EncabezadoFlujo perfil="Pijama para Mujer" paso="Parte superior" pasoActual={2} totalPasos={15} />

      <main className="flex flex-1 flex-col gap-10 px-4 py-6">
        <div className="flex flex-col gap-2">
          <p className="m-0 estilo-etiqueta text-primario">Hecho a mano por tu costurera</p>
          <h1 className="m-0 estilo-display text-texto">Sistema de diseño</h1>
          <p className="m-0 estilo-cuerpo text-texto-secundario">
            Tokens y componentes de IriConfex, tomados de Figma. Vista para revisar en celular.
          </p>
        </div>

        <Seccion titulo="Tipografía">
          <div className="flex flex-col gap-2">
            <p className="m-0 estilo-display">Arma tu pijama</p>
            <p className="m-0 estilo-titulo-1">¿Para quién es la pijama?</p>
            <p className="m-0 estilo-titulo-2">Elige el escote</p>
            <p className="m-0 estilo-titulo-3">Parte superior</p>
            <p className="m-0 estilo-cuerpo">Cintura con elástico, sin bolsillos, bota recta.</p>
            <p className="m-0 estilo-cuerpo-fuerte">Botones y etiquetas en 600</p>
            <p className="m-0 estilo-pequeno">Precio estimado, sujeto a confirmación, no incluye envío.</p>
          </div>
        </Seccion>

        <Seccion titulo="Color">
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {colores.map(([nombre, clase]) => (
              <li key={nombre} className="overflow-hidden rounded-campo border border-borde bg-superficie shadow-1">
                <div className={`h-10 ${clase}`} />
                <p className="m-0 px-3 py-2 estilo-pequeno text-texto">{nombre}</p>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="Botones">
          <Boton>Solicitar cotización</Boton>
          <Boton tipo="secundario">Copiar mensaje</Boton>
          <Boton tipo="whatsapp">Escribir por WhatsApp</Boton>
          <Boton disabled>Solicitar cotización</Boton>
        </Seccion>

        <Seccion titulo="Tarjetas de opción">
          <RejillaOpciones etiqueta="Manga">
            {opcionesMuestra.map((o) => (
              <TarjetaOpcion
                key={o.id}
                nombre={o.nombre}
                seleccionada={opcion === o.id}
                deshabilitada={o.deshabilitada}
                onSeleccionar={() => setOpcion(o.id)}
              />
            ))}
          </RejillaOpciones>
          <AvisoEnLinea>El escote bralette lleva tirantes.</AvisoEnLinea>
        </Seccion>

        <Seccion titulo="Chips de talla">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Talla">
            {tallasMuestra.map((t) => (
              <ChipSeleccion key={t} seleccionado={talla === t} onClick={() => setTalla(t)}>
                {t}
              </ChipSeleccion>
            ))}
            <ChipSeleccion disabled>XXL</ChipSeleccion>
          </div>
        </Seccion>

        <Seccion titulo="Selector sí / no">
          <p className="m-0 estilo-cuerpo-fuerte">¿Es para niña?</p>
          <SelectorSiNo etiqueta="¿Es para niña?" valor={esNina} onCambiar={setEsNina} />
        </Seccion>

        <Seccion titulo="Campo de medida">
          <CampoMedida
            etiqueta="Contorno de busto"
            placeholder="Ej. 90"
            value={medida}
            onChange={(e) => setMedida(e.target.value)}
            error={errorMedida}
          />
          <CampoMedida etiqueta="Distrito" placeholder="Elige primero el cantón" disabled />
        </Seccion>

        <Seccion titulo="Avisos">
          <AvisoEnLinea tipo="info">Cintura con elástico, sin bolsillos, bota recta.</AvisoEnLinea>
          <AvisoEnLinea tipo="aviso">Color de referencia: la costurera confirmará si lo consigue</AvisoEnLinea>
          <AvisoEnLinea tipo="error">Escribe una medida entre 40 y 200 cm.</AvisoEnLinea>
          <AvisoEnLinea tipo="exito">Listo: tu solicitud de cotización está lista para enviar.</AvisoEnLinea>
        </Seccion>

        <Seccion titulo="Barra inferior (variantes)">
          <div className="flex flex-col gap-4 rounded-tarjeta bg-lienzo py-4">
            <BarraInferiorFija precioEstimado={10000} />
            <BarraInferiorFija precioEstimado={null} />
            <BarraInferiorFija precioEstimado={10000} deshabilitada />
          </div>
        </Seccion>
      </main>

      <BarraInferiorFija className="sticky bottom-0" precioEstimado={18500} deshabilitada={!opcion} />
    </div>
  )
}

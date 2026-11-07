import { camposQueAplican, formatoNumero, type Seleccion } from '@iriconfex/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { configuraciones } from './configuraciones'
import { FlujoConfiguracion } from './FlujoConfiguracion'

const configuracion = configuraciones[0]

const siguiente = () => userEvent.click(screen.getByRole('button', { name: /^(Siguiente|Revisar)$/ }))
async function elegirYSeguir(nombre: string | RegExp) {
  await userEvent.click(screen.getByRole('radio', { name: nombre }))
  await siguiente()
}

/** Pijama de hombre, manga corta y short, con «Mis medidas», hasta la pantalla de medidas. */
async function hastaMedidas() {
  await elegirYSeguir('Hombre')
  await siguiente() // base fijada
  await elegirYSeguir('Redondo')
  await elegirYSeguir('Manga corta')
  await siguiente() // acabado fijado
  await elegirYSeguir('Short corto')
  await siguiente() // acabado inferior único
  await elegirYSeguir('Brush')
  await elegirYSeguir('Brush')
  await elegirYSeguir('Mis medidas')
  await elegirYSeguir(/^Adulto/)
}

const seleccionEsperada = { perfil: 'hombre', manga: 'corta', 'tipo-inferior': 'short', 'modalidad-talla': 'medida' }
const campos = camposQueAplican(configuracion, { ...seleccionEsperada, base: 'dos-piezas' } as Seleccion).flatMap(
  (g) => g.campos,
)
const valorMedio = (c: { min: number; max: number }) => Math.round((c.min + c.max) / 2)

describe('HU-14 · medidas propias con guía visual', () => {
  it('pide los campos con su guía, cómo medir y la unidad, y no avanza con vacíos o fuera de rango', async () => {
    const { container } = render(<FlujoConfiguracion configuracion={configuracion} />)
    await hastaMedidas()

    expect(screen.getByRole('heading', { name: 'Parte de arriba' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parte de abajo' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(campos.length)
    // CA4: guía del perfil elegido y la indicación ligada al campo.
    expect(container.querySelector('img[src="/medidas/hombre/ancho-espalda.svg"]')).not.toBeNull()
    expect(screen.getByLabelText('Ancho de espalda')).toHaveAccessibleDescription(campos[0].como)
    expect(screen.getAllByText('cm').length).toBeGreaterThanOrEqual(campos.length)

    await siguiente()
    expect(screen.getAllByText('Completa este campo.')).toHaveLength(campos.length)

    await userEvent.type(screen.getByLabelText('Ancho de espalda'), '400')
    expect(screen.getByLabelText('Ancho de espalda')).toHaveAccessibleDescription(
      `${campos[0].como} Escribe un número entre 28 y 65 cm.`,
    )
  })

  it('las medidas aparecen en el resumen, se pueden cambiar y viajan en la solicitud (CA6)', async () => {
    const onSolicitar = vi.fn(async () => {})
    render(<FlujoConfiguracion configuracion={configuracion} onSolicitar={onSolicitar} />)
    await hastaMedidas()
    for (const campo of campos) {
      await userEvent.type(screen.getByLabelText(campo.nombre), formatoNumero(valorMedio(campo)))
    }
    await userEvent.clear(screen.getByLabelText('Ancho de espalda'))
    await userEvent.type(screen.getByLabelText('Ancho de espalda'), '38,5')
    await siguiente()
    await siguiente() // entrega fijada
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis')
    await userEvent.type(screen.getByLabelText('Teléfono'), '88887777')
    await siguiente()

    expect(screen.getByRole('heading', { name: 'Tus medidas' })).toBeInTheDocument()
    expect(screen.getByText('38,5 cm')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar Largo de short' }))
    await userEvent.clear(screen.getByLabelText('Largo de short'))
    await userEvent.type(screen.getByLabelText('Largo de short'), '45')
    await userEvent.click(screen.getByRole('button', { name: 'Volver al resumen' }))
    expect(screen.getByText('45 cm')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    const [solicitud] = onSolicitar.mock.calls[0] as unknown as [{ medidas: Record<string, number> }]
    expect(Object.keys(solicitud.medidas)).toHaveLength(campos.length)
    expect(solicitud.medidas).toMatchObject({ 'ancho-espalda': 38.5, 'largo-short': 45 })
  })

  it('talla estándar: se ve qué parte se elige y la guía de tallas resalta la elegida (HU-13)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Mujer')
    await elegirYSeguir('2 piezas')
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Manga corta')
    await elegirYSeguir('No')
    await elegirYSeguir('A la cadera')
    await elegirYSeguir('Simple')
    await elegirYSeguir('Pantalón largo')
    await elegirYSeguir('Simple')
    expect(screen.getByText('Parte de arriba')).toBeInTheDocument()
    await elegirYSeguir('Brush')
    expect(screen.getByText('Parte de abajo')).toBeInTheDocument()
    await elegirYSeguir('Brush')
    await elegirYSeguir('Talla estándar')
    await elegirYSeguir(/^Adulto/)

    expect(screen.getByText('Parte de arriba')).toBeInTheDocument()
    const tabla = screen.getByRole('table')
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Talla', 'Busto', 'Cintura'])
    expect(screen.getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['S', 'M', 'L', 'XL'])
    await userEvent.click(screen.getByRole('radio', { name: 'M' }))
    expect(tabla.querySelector('[aria-current="true"] th')?.textContent).toBe('M')

    await siguiente()
    expect(screen.getByText('Parte de abajo')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Talla', 'Cintura', 'Cadera'])
  })

  it('con talla estándar no aparece la pantalla de medidas ni se envían medidas', async () => {
    const onSolicitar = vi.fn(async () => {})
    render(<FlujoConfiguracion configuracion={configuracion} onSolicitar={onSolicitar} />)
    await elegirYSeguir('Hombre')
    await siguiente()
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Manga corta')
    await siguiente()
    await elegirYSeguir('Short corto')
    await siguiente()
    await elegirYSeguir('Brush')
    await elegirYSeguir('Brush')
    await elegirYSeguir('Talla estándar')
    await elegirYSeguir(/^Adulto/)
    await elegirYSeguir('M')
    await elegirYSeguir('M')
    expect(screen.queryByRole('heading', { name: 'Parte de arriba' })).toBeNull()
    await siguiente() // entrega
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis')
    await userEvent.type(screen.getByLabelText('Teléfono'), '88887777')
    await siguiente()
    expect(screen.queryByRole('heading', { name: 'Tus medidas' })).toBeNull()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    expect(onSolicitar.mock.calls[0]).toEqual([expect.not.objectContaining({ medidas: expect.anything() })])
  })
})

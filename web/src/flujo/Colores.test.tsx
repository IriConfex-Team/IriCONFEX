import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { configuraciones } from './configuraciones'
import { FlujoConfiguracion } from './FlujoConfiguracion'

const configuracion = configuraciones[0]
const colores = configuracion.colores!

const siguiente = () => userEvent.click(screen.getByRole('button', { name: /^(Siguiente|Revisar)$/ }))
async function elegirYSeguir(nombre: string | RegExp) {
  await userEvent.click(screen.getByRole('radio', { name: nombre }))
  await siguiente()
}

/** Pijama de hombre hasta la pantalla del color de la tela de arriba. */
async function hastaColorDeArriba() {
  await elegirYSeguir('Hombre')
  await siguiente() // base fijada
  await elegirYSeguir('Redondo')
  await elegirYSeguir('Manga corta')
  await siguiente() // acabado único
  await elegirYSeguir('Short corto')
  await siguiente() // acabado inferior único
  await elegirYSeguir('Brush')
}

describe('HU-12a · color de cada pieza', () => {
  it('después de la tela pide su color, con los del catálogo de esa tela y «Otro color»', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await hastaColorDeArriba()

    expect(screen.getByText('Color de la parte de arriba')).toBeInTheDocument()
    expect(screen.getByText('Parte de arriba')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: colores.otro.nombre })).toBeInTheDocument()
    // Sin elegir no se puede seguir.
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    // La tela tiene lisos y estampados: primero se elige cuál, y solo se muestran esos.
    expect(screen.getByText(colores.tipos!.pregunta)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Rosado Claro' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: colores.tipos!.estampado }))
    expect(screen.getByRole('heading', { name: 'Estampados' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Colores lisos' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: colores.tipos!.liso }))
    expect(screen.getByRole('heading', { name: 'Colores lisos' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Estampados' })).toBeNull()

    await userEvent.click(screen.getByRole('radio', { name: 'Rosado Claro' }))
    expect(screen.getByRole('radio', { name: 'Rosado Claro' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Elegiste: Rosado Claro')).toBeInTheDocument()
    expect(screen.getByText(colores.rotuloCatalogo, { exact: false })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: colores.tipos!.estampado }))
    await userEvent.click(screen.getByRole('radio', { name: /^Flores/ }))
    expect(screen.getByText(colores.rotuloEstampado, { exact: false })).toBeInTheDocument()

    // La tela de abajo tiene su propio catálogo.
    await siguiente()
    expect(screen.getByText('Tela de la parte de abajo')).toBeInTheDocument()
    await elegirYSeguir('Satín')
    expect(screen.getByText('Color de la parte de abajo')).toBeInTheDocument()
    // Satín solo tiene estampados: no se pregunta lisa o estampada.
    expect(screen.queryByText(colores.tipos!.pregunta)).toBeNull()
    expect(screen.queryByRole('radio', { name: 'Rosado Claro' })).toBeNull()
    expect(screen.getByRole('radio', { name: 'ST-29' })).toBeInTheDocument()
  })

  it('«Otro color» pide escribirlo, muestra su rótulo y viaja en la solicitud y el resumen', async () => {
    const onSolicitar = vi.fn().mockResolvedValue(undefined)
    render(<FlujoConfiguracion configuracion={configuracion} onSolicitar={onSolicitar} />)
    await hastaColorDeArriba()

    await userEvent.click(screen.getByRole('radio', { name: colores.otro.nombre }))
    expect(screen.getByText(colores.otro.rotulo)).toBeInTheDocument()
    await siguiente()
    // Vacío no avanza.
    expect(screen.getByText('Escribe el color que buscas.')).toBeInTheDocument()
    expect(screen.getByText('Color de la parte de arriba')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(colores.otro.pregunta), '  vino ')
    await siguiente()
    await elegirYSeguir('Brush')
    await userEvent.click(screen.getByRole('button', { name: colores.tipos!.liso }))
    await elegirYSeguir('Blanco Hueso')
    await elegirYSeguir('Talla estándar')
    await elegirYSeguir(/^Adulto/)
    await elegirYSeguir('M')
    await elegirYSeguir('M')
    await siguiente() // entrega fijada
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Teléfono'), '88887777')
    await siguiente()

    expect(screen.getByText('Otro color: vino')).toBeInTheDocument()
    expect(screen.getByText('Blanco Hueso')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    expect(onSolicitar.mock.calls[0][0]).toMatchObject({
      colores: { 'tela-superior': { otro: 'vino' }, 'tela-inferior': { catalogo: 'blanco-hueso' } },
    })
  })
})

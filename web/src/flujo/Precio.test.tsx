import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Cotizacion } from '../api/cliente'
import { configuraciones } from './configuraciones'
import { FlujoConfiguracion } from './FlujoConfiguracion'

const configuracion = configuraciones[0]

const estimado = (precioEstimadoCrc: number): Cotizacion => ({ estado: 'estimado', precioEstimadoCrc, moneda: 'CRC', lineas: [] })
const aConfirmar: Cotizacion = { estado: 'a_confirmar', precioEstimadoCrc: null, moneda: 'CRC', lineas: [] }
const incompleto: Cotizacion = { estado: 'incompleto', precioEstimadoCrc: null, moneda: 'CRC', lineas: [] }

describe('HU-18 · precio estimado en la barra inferior', () => {
  it('muestra el precio que calcula el servidor, con «estimado»', async () => {
    const onCotizar = vi.fn(async () => estimado(11500))
    render(<FlujoConfiguracion configuracion={configuracion} onCotizar={onCotizar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))

    expect(await screen.findByText('₡11 500')).toBeInTheDocument()
    expect(screen.getByText('Precio estimado')).toBeInTheDocument()
    // Se manda lo elegido, nunca un precio
    const [entrada] = onCotizar.mock.calls.at(-1) as unknown as [Record<string, unknown>]
    expect(entrada).toMatchObject({ categoria: configuracion.categoria.id, seleccion: { perfil: 'bebe' } })
    expect(JSON.stringify(entrada)).not.toMatch(/precio/i)
  })

  it('si falta un precio en la tabla muestra «Precio a confirmar por la costurera»', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} onCotizar={async () => aConfirmar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))
    expect(await screen.findByText('Precio a confirmar por la costurera')).toBeInTheDocument()
  })

  it('mientras la selección está incompleta no muestra ningún precio', async () => {
    const onCotizar = vi.fn(async () => incompleto)
    render(<FlujoConfiguracion configuracion={configuracion} onCotizar={onCotizar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))
    await vi.waitFor(() => expect(onCotizar).toHaveBeenCalled())
    expect(screen.queryByText('Precio estimado')).toBeNull()
    expect(screen.queryByText('Precio a confirmar por la costurera')).toBeNull()
  })

  it('si la consulta falla, no se rompe: simplemente no hay precio', async () => {
    const onCotizar = vi.fn(async () => {
      throw new Error('sin conexión')
    })
    render(<FlujoConfiguracion configuracion={configuracion} onCotizar={onCotizar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))
    await vi.waitFor(() => expect(onCotizar).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    expect(screen.queryByText(/₡/)).toBeNull()
  })

  it('sin onCotizar el flujo funciona igual y no hay precio', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))
    expect(screen.queryByText(/₡/)).toBeNull()
  })
})
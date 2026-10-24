import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListaOpciones, TarjetaOpcionDetallada } from './TarjetaOpcionDetallada'

describe('TarjetaOpcionDetallada', () => {
  it('muestra nombre, descripción y etiqueta, y expone la selección como radio', () => {
    render(
      <ListaOpciones etiqueta="Tela">
        <TarjetaOpcionDetallada nombre="Tela A" descripcion="Suave y fresca." etiqueta="Requiere más tela." seleccionada />
        <TarjetaOpcionDetallada nombre="Tela B" />
      </ListaOpciones>,
    )
    expect(screen.getByRole('radiogroup', { name: 'Tela' })).toBeInTheDocument()
    const tarjeta = screen.getByRole('radio', { name: 'Tela A' })
    expect(tarjeta).toHaveAttribute('aria-checked', 'true')
    expect(tarjeta).toHaveAccessibleDescription('Suave y fresca. Requiere más tela.')
    expect(screen.getByText('Suave y fresca.')).toBeInTheDocument()
    expect(screen.getByText('Requiere más tela.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tela B' })).toHaveAttribute('aria-checked', 'false')
  })

  it('llama a onSeleccionar al tocarla', async () => {
    const onSeleccionar = vi.fn()
    render(<TarjetaOpcionDetallada nombre="Tela A" onSeleccionar={onSeleccionar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Tela A' }))
    expect(onSeleccionar).toHaveBeenCalledOnce()
  })
})

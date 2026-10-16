import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RejillaOpciones, TarjetaOpcion } from './TarjetaOpcion'

describe('TarjetaOpcion', () => {
  it('expone el estado seleccionado como radio marcado', () => {
    render(
      <RejillaOpciones etiqueta="Manga">
        <TarjetaOpcion nombre="Manga corta" seleccionada />
        <TarjetaOpcion nombre="Sin manga" />
      </RejillaOpciones>,
    )
    expect(screen.getByRole('radiogroup', { name: 'Manga' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Manga corta' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Sin manga' })).toHaveAttribute('aria-checked', 'false')
  })

  it('llama a onSeleccionar al tocarla', async () => {
    const onSeleccionar = vi.fn()
    render(<TarjetaOpcion nombre="Tirantes" onSeleccionar={onSeleccionar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Tirantes' }))
    expect(onSeleccionar).toHaveBeenCalledOnce()
  })

  it('deshabilitada muestra el motivo y no se puede elegir', async () => {
    const onSeleccionar = vi.fn()
    render(<TarjetaOpcion nombre="Manga larga" deshabilitada onSeleccionar={onSeleccionar} />)
    const tarjeta = screen.getByRole('radio', { name: /Manga larga/ })
    expect(tarjeta).toBeDisabled()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
    await userEvent.click(tarjeta)
    expect(onSeleccionar).not.toHaveBeenCalled()
  })
})

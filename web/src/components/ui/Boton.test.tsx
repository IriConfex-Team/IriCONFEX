import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Boton } from './Boton'

describe('Boton', () => {
  it('ejecuta onClick cuando está habilitado', async () => {
    const onClick = vi.fn()
    render(<Boton onClick={onClick}>Solicitar cotización</Boton>)
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('no ejecuta onClick cuando está deshabilitado', async () => {
    const onClick = vi.fn()
    render(
      <Boton disabled onClick={onClick}>
        Solicitar cotización
      </Boton>,
    )
    const boton = screen.getByRole('button', { name: 'Solicitar cotización' })
    expect(boton).toBeDisabled()
    await userEvent.click(boton)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('muestra el ícono de WhatsApp solo en el tipo whatsapp', () => {
    const { container, rerender } = render(<Boton tipo="whatsapp">Escribir por WhatsApp</Boton>)
    expect(container.querySelector('img')).not.toBeNull()
    rerender(<Boton>Solicitar cotización</Boton>)
    expect(container.querySelector('img')).toBeNull()
  })
})

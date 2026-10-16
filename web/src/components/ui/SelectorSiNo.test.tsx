import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectorSiNo } from './SelectorSiNo'

describe('SelectorSiNo', () => {
  it('sin responder, ninguna opción está marcada', () => {
    render(<SelectorSiNo etiqueta="¿Es para niña?" valor={null} onCambiar={() => {}} />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('informa la respuesta elegida', async () => {
    const onCambiar = vi.fn()
    render(<SelectorSiNo etiqueta="¿Es para niña?" valor={null} onCambiar={onCambiar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Sí' }))
    expect(onCambiar).toHaveBeenCalledWith(true)
    await userEvent.click(screen.getByRole('radio', { name: 'No' }))
    expect(onCambiar).toHaveBeenCalledWith(false)
  })
})

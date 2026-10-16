import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarraInferiorFija } from './BarraInferiorFija'

describe('BarraInferiorFija', () => {
  it('siempre rotula el precio como estimado', () => {
    render(<BarraInferiorFija precioEstimado={10000} />)
    expect(screen.getByText('Precio estimado')).toBeInTheDocument()
    // Testing Library normaliza el espacio sin corte a espacio simple.
    expect(screen.getByText('₡10 000')).toBeInTheDocument()
  })

  it('sin precio en la tabla muestra «a confirmar» y permite seguir', () => {
    render(<BarraInferiorFija precioEstimado={null} />)
    expect(screen.getByText('Precio a confirmar por la costurera')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('deshabilitada bloquea «Siguiente»', () => {
    render(<BarraInferiorFija precioEstimado={10000} deshabilitada />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })
})

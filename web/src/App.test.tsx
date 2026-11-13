import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { configuraciones } from './flujo/configuraciones'
import { Categorias } from './pages/Categorias'

describe('HU-01 · ver categorías', () => {
  beforeEach(() => window.history.pushState(null, '', '/'))

  it('del inicio a las categorías y de la tarjeta al flujo (CA1, CA4)', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tu pijama, hecha a mano y a tu gusto' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Diseñar mi pijama' }))
    expect(window.location.pathname).toBe('/categorias')
    expect(screen.getByRole('heading', { name: '¿Qué quieres diseñar?' })).toBeInTheDocument()
    const tarjeta = screen.getByRole('button', { name: /Pijamas.*Para mujer, hombre, niños y bebé/ })
    expect(screen.getByText('Pronto podrás diseñar otras prendas.')).toBeInTheDocument()

    await userEvent.click(tarjeta)
    expect(window.location.pathname).toBe('/disenar/pijamas')
    expect(await screen.findByText('¿Para quién es la pijama?')).toBeInTheDocument()

    // «Atrás» en el primer paso vuelve a las categorías.
    await userEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    expect(window.location.pathname).toBe('/categorias')
  })

  it('el botón «atrás» del navegador también funciona', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Diseñar mi pijama' }))
    act(() => {
      window.history.pushState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('button', { name: 'Diseñar mi pijama' })).toBeInTheDocument()
  })

  it('cada configuración cargada es una categoría; sin aviso de «pronto» si hay más de una (CA2)', () => {
    const camisas = structuredClone(configuraciones[0])
    camisas.categoria = { id: 'camisas', nombre: 'Arma tu camisa', tarjeta: { titulo: 'Camisas', descripcion: 'Hechas a tu medida' } }
    render(<Categorias configuraciones={[configuraciones[0], camisas]} onElegir={() => {}} onAtras={() => {}} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Camisas.*Hechas a tu medida/ })).toBeInTheDocument()
    expect(screen.queryByText('Pronto podrás diseñar otras prendas.')).toBeNull()
  })
})

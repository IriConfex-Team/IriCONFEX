import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { configuraciones } from './configuraciones'
import { FlujoConfiguracion } from './FlujoConfiguracion'

const configuracion = configuraciones[0]

async function elegirYSeguir(nombre: string) {
  await userEvent.click(screen.getByRole('radio', { name: nombre }))
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
}

describe('FlujoConfiguracion (con la configuración de datos/categorias)', () => {
  it('empieza en el primer paso con «Siguiente» deshabilitado', () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    expect(screen.getByRole('radiogroup', { name: '¿Para quién es la pijama?' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('muestra el perfil en el encabezado y fija la base con su mensaje', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Hombre')
    expect(screen.getByText('Pijama para Hombre')).toBeInTheDocument()
    expect(screen.getByText('Pijama de 2 piezas')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '2 piezas' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('fija la manga con bralette y lo explica en una línea (R1)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Mujer')
    await elegirYSeguir('2 piezas')
    await elegirYSeguir('Bralette')
    expect(screen.getByText('El escote bralette lleva tirantes.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tirantes' })).toHaveAttribute('aria-checked', 'true')
  })

  it('al cambiar de perfil reinicia la configuración con aviso (HU-04 CA3)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Mujer')
    await elegirYSeguir('1 pieza (bata)')
    await userEvent.click(screen.getByRole('button', { name: 'cambiar' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Bebé' }))
    expect(screen.getByText('Se reinició la configuración.')).toBeInTheDocument()
    expect(screen.getByText('Pijama para Bebé')).toBeInTheDocument()
  })

  it('usa el selector sí / no para pasos de ese tipo', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Niño o niña')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' })) // base fijada
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Manga corta')
    expect(screen.getByRole('radiogroup', { name: '¿Es para niña?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Sí' }))
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('radio', { name: 'Vuelitos' })).toBeInTheDocument()
  })

  it('al volver atrás y cambiar una elección borra lo posterior que ya no aplica (HU-06 CA5)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Mujer')
    await elegirYSeguir('2 piezas')
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Tirantes')
    await elegirYSeguir('A la cadera')
    await userEvent.click(screen.getByRole('radio', { name: 'Encaje' }))
    // Volver a manga y elegir manga larga: el encaje deja de aplicar.
    await userEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Manga larga' }))
    expect(screen.getByText(/Se borró lo que elegiste en «Acabado de la parte de arriba»/)).toBeInTheDocument()
  })

  it('una elección posterior incompatible muestra el aviso y ofrece cambiar la anterior (HU-06 CA7)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Hombre')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' })) // base fijada
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Manga corta')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' })) // acabado fijado
    await elegirYSeguir('Short corto')
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' })) // acabado inferior único
    await userEvent.click(screen.getByRole('radio', { name: 'Satín' }))
    expect(screen.getByText('El satín puro solo se confecciona en piezas holgadas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar escote' }))
    expect(screen.getByRole('radiogroup', { name: 'Escote' })).toBeInTheDocument()
  })
})

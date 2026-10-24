import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { configuraciones } from './configuraciones'
import { FlujoConfiguracion } from './FlujoConfiguracion'
import { avisoDatos } from './textosDatos'

const configuracion = configuraciones[0]
const negocio = configuracion.negocio!

const siguiente = () => userEvent.click(screen.getByRole('button', { name: /^(Siguiente|Revisar)$/ }))
async function elegirYSeguir(nombre: string | RegExp) {
  await userEvent.click(screen.getByRole('radio', { name: nombre }))
  await siguiente()
}

/** Recorre una pijama de bebé hasta la pantalla de datos de contacto. */
async function hastaContacto() {
  await elegirYSeguir('Bebé')
  await siguiente() // base fijada
  await elegirYSeguir('Redondo')
  await elegirYSeguir('Manga corta')
  await elegirYSeguir('No') // ¿Es para niña?
  await siguiente() // acabado único
  await elegirYSeguir('Short corto')
  await siguiente() // acabado inferior único
  await elegirYSeguir('Brush')
  await elegirYSeguir('Modal')
  await elegirYSeguir('Talla estándar')
  await siguiente() // grupo fijado
  await elegirYSeguir('3-6 meses')
  await elegirYSeguir('6-9 meses')
  await siguiente() // entrega fijada
}

describe('fin del flujo: contacto, resumen y aviso de datos', () => {
  it('pide nombre y teléfono válidos antes del resumen (HU-19)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await hastaContacto()
    expect(screen.getByText('Tus datos')).toBeInTheDocument()
    await siguiente()
    expect(screen.getByText('Escribe tu nombre.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu teléfono.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Teléfono'), '1234')
    await siguiente()
    expect(screen.getByText(/8 dígitos/)).toBeInTheDocument()
  })

  it('el resumen agrupa lo elegido, permite cambiar y exige aceptar el aviso (HU-20, HU-21)', async () => {
    const onSolicitar = vi.fn(async () => {})
    render(<FlujoConfiguracion configuracion={configuracion} onSolicitar={onSolicitar} />)
    await hastaContacto()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana Mora')
    await userEvent.type(screen.getByLabelText('Teléfono'), '8888 7777')
    await siguiente()

    expect(screen.getByText('Revisa tu solicitud')).toBeInTheDocument()
    for (const titulo of ['Tus datos', 'Perfil', 'Parte superior', 'Parte inferior', 'Telas', 'Tallaje', 'Entrega']) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
    expect(screen.getByText('8888-7777')).toBeInTheDocument()
    expect(screen.getByText('Retiro en el local')).toBeInTheDocument()
    // Las opciones fijadas no se pueden cambiar desde el resumen.
    expect(screen.queryByRole('button', { name: 'Cambiar Base' })).toBeNull()

    const boton = screen.getByRole('button', { name: 'Solicitar cotización' })
    expect(boton).toBeDisabled()
    expect(screen.getByText(avisoDatos(negocio))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(boton).toBeEnabled()
    await userEvent.click(boton)

    expect(onSolicitar).toHaveBeenCalledOnce()
    const [solicitud] = onSolicitar.mock.calls[0] as unknown as [Record<string, unknown>]
    expect(solicitud).toMatchObject({
      categoria: configuracion.categoria.id,
      contacto: { nombre: 'Ana Mora', telefono: '88887777' },
      consentimiento: { aceptado: true },
      seleccion: { perfil: 'bebe', entrega: 'retiro' },
    })
    expect(await screen.findByText('Listo: tu solicitud de cotización se envió.')).toBeInTheDocument()
  })

  it('«cambiar» lleva al paso y se puede volver al resumen conservando el resto (HU-21 CA2)', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await hastaContacto()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Teléfono'), '88887777')
    await siguiente()
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar Tela de la parte de arriba' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Rib acanalado' }))
    await userEvent.click(screen.getByRole('button', { name: 'Volver al resumen' }))
    expect(screen.getByText('Rib acanalado')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })
})

describe('información del local (HU-03, HU-15, HU-16)', () => {
  it('se abre desde el encabezado en cualquier paso, con mapa y WhatsApp', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await userEvent.click(screen.getByRole('button', { name: 'Información del local' }))
    const hoja = screen.getByRole('dialog', { name: negocio.nombre })
    expect(within(hoja).getByRole('link', { name: negocio.direccion })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    )
    expect(within(hoja).getByRole('link', { name: /WhatsApp 8341-3594/ })).toHaveAttribute('href', 'https://wa.me/50683413594')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('aparece al elegir medición presencial y en el paso de entrega', async () => {
    render(<FlujoConfiguracion configuracion={configuracion} />)
    await elegirYSeguir('Hombre')
    await siguiente()
    await elegirYSeguir('Redondo')
    await elegirYSeguir('Manga corta')
    await siguiente()
    await elegirYSeguir('Short corto')
    await siguiente()
    await elegirYSeguir('Brush')
    await elegirYSeguir('Brush')
    await userEvent.click(screen.getByRole('radio', { name: 'Medición presencial' }))
    expect(screen.getByRole('link', { name: negocio.direccion })).toBeInTheDocument()
  })
})

describe('aviso de datos (HU-20 CA1)', () => {
  it('tiene 120 palabras o menos y menciona la retención de 90 días', () => {
    const texto = avisoDatos(negocio)
    expect(texto.split(/\s+/).length).toBeLessThanOrEqual(120)
    expect(texto).toContain('90 días')
  })
})

import { describe, expect, it } from 'vitest'
import { esquemaSolicitud, formatoTelefono, normalizarTelefono, validarContacto } from './solicitud'

describe('datos de contacto (HU-19)', () => {
  it('acepta teléfonos de Costa Rica escritos de varias formas', () => {
    expect(normalizarTelefono('8341-3594')).toBe('83413594')
    expect(normalizarTelefono('+506 8341 3594')).toBe('83413594')
    expect(formatoTelefono('83413594')).toBe('8341-3594')
    expect(validarContacto({ nombre: 'Ana', telefono: '2460 1234' })).toEqual({})
  })

  it('pide nombre y teléfono, con nombre de 60 caracteres o menos y 8 dígitos', () => {
    expect(validarContacto({ nombre: '  ', telefono: '' })).toEqual({
      nombre: 'Escribe tu nombre.',
      telefono: 'Escribe tu teléfono.',
    })
    expect(validarContacto({ nombre: 'a'.repeat(61), telefono: '1234' })).toEqual({
      nombre: 'Usa 60 caracteres o menos.',
      telefono: 'Escribe un número de 8 dígitos, por ejemplo 8888-8888.',
    })
    expect(validarContacto({ nombre: 'Ana', telefono: '1834 1359' }).telefono).toBeDefined()
  })
})

describe('contrato de la solicitud', () => {
  const valida = {
    categoria: 'cat',
    seleccion: { a: 'b' },
    contacto: { nombre: ' Ana ', telefono: '8341-3594' },
    consentimiento: { aceptado: true, fecha: '2026-10-23T18:00:00.000Z' },
  }

  it('normaliza el contacto', () => {
    expect(esquemaSolicitud.parse(valida).contacto).toEqual({ nombre: 'Ana', telefono: '83413594' })
  })

  it('rechaza una solicitud sin aceptación del aviso (HU-20)', () => {
    expect(esquemaSolicitud.safeParse({ ...valida, consentimiento: { aceptado: false, fecha: valida.consentimiento.fecha } }).success).toBe(false)
  })
})

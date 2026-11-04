import { z } from 'zod'

/** HU-19 CA1: nombre de 60 caracteres o menos. */
export const LIMITE_NOMBRE = 60

/** Deja solo los dígitos de un teléfono escrito con espacios, guiones o el prefijo 506. */
export function normalizarTelefono(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  return digitos.length === 11 && digitos.startsWith('506') ? digitos.slice(3) : digitos
}

/** Teléfono de Costa Rica: 8 dígitos, fijo (2, 4) o celular (5–8). */
export function esTelefonoValido(texto: string): boolean {
  return /^[245678]\d{7}$/.test(normalizarTelefono(texto))
}

/** «83413594» → «8341-3594». */
export function formatoTelefono(texto: string): string {
  const d = normalizarTelefono(texto)
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : texto
}

export interface ErroresContacto {
  nombre?: string
  telefono?: string
}

/** Validación de los únicos datos personales obligatorios (HU-19). */
export function validarContacto(contacto: { nombre: string; telefono: string }): ErroresContacto {
  const errores: ErroresContacto = {}
  const nombre = contacto.nombre.trim()
  if (nombre.length === 0) errores.nombre = 'Escribe tu nombre.'
  else if (nombre.length > LIMITE_NOMBRE) errores.nombre = `Usa ${LIMITE_NOMBRE} caracteres o menos.`
  if (normalizarTelefono(contacto.telefono).length === 0) errores.telefono = 'Escribe tu teléfono.'
  else if (!esTelefonoValido(contacto.telefono)) errores.telefono = 'Escribe un número de 8 dígitos, por ejemplo 8888-8888.'
  return errores
}

/**
 * Lo que el navegador envía a la API al solicitar la cotización (contrato para HU-22 y HU-25).
 * El servidor revalida `seleccion` con `validarSeleccion()`, calcula el precio y arma el mensaje.
 */
export const esquemaSolicitud = z.strictObject({
  categoria: z.string().min(1),
  seleccion: z.record(z.string(), z.string()),
  contacto: z.strictObject({
    nombre: z.string().trim().min(1).max(LIMITE_NOMBRE),
    telefono: z.string().refine(esTelefonoValido, 'teléfono de Costa Rica de 8 dígitos').transform(normalizarTelefono),
  }),
  /** HU-20 CA3: la aceptación y su fecha se guardan con la solicitud. */
  consentimiento: z.strictObject({ aceptado: z.literal(true), fecha: z.iso.datetime() }),
})

export type SolicitudCotizacion = z.input<typeof esquemaSolicitud>

/**
 * Formato de precio de Figma: «₡10 000» — ₡ pegado, miles con espacio, sin decimales.
 * Usa espacio sin corte (U+00A0) para que el monto no se parta en dos líneas.
 */
export function formatColones(monto: number): string {
  const entero = Math.round(monto)
  const signo = entero < 0 ? '-' : ''
  const cifras = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${signo}₡${cifras}`
}

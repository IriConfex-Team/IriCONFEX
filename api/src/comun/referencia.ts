import { randomInt } from 'node:crypto';

// Confirma con el equipo: el contrato de ejemplo usa «IRI», la guía anterior «IC».
// Cambiarlo es tocar esta única constante.
export const PREFIJO_REFERENCIA = 'IRI';

// 32 caracteres, sin 0, O, 1 ni I (se confunden al leerlos por WhatsApp)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generarReferencia(
  longitud = 8,
  aleatorio: (max: number) => number = randomInt,
): string {
  let sufijo = '';
  for (let i = 0; i < longitud; i++) {
    sufijo += ALFABETO[aleatorio(ALFABETO.length)];
  }
  return PREFIJO_REFERENCIA + '-' + sufijo;
}

/** Rectángulo en las coordenadas del conjunto ilustrado. */
export interface Caja {
  x: number
  y: number
  ancho: number
  alto: number
}

export function unirCajas(a: Caja, b: Caja): Caja {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, ancho: Math.max(a.x + a.ancho, b.x + b.ancho) - x, alto: Math.max(a.y + a.alto, b.y + b.alto) - y }
}

/** Agrega margen y ajusta a la proporción pedida (ancho / alto), centrado en la zona de interés. */
export function encuadrar(zona: Caja, proporcion: number): Caja {
  const margen = Math.max(16, 0.15 * Math.max(zona.ancho, zona.alto))
  let ancho = zona.ancho + 2 * margen
  let alto = zona.alto + 2 * margen
  if (ancho / alto < proporcion) ancho = alto * proporcion
  else alto = ancho / proporcion
  return { x: zona.x + zona.ancho / 2 - ancho / 2, y: zona.y + zona.alto / 2 - alto / 2, ancho, alto }
}

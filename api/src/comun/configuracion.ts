import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cargarConfiguracion } from '@iriconfex/shared';

export type ConfiguracionNegocio = ReturnType<typeof cargarConfiguracion>;

export function cargarConfigPijamas(ruta: string): ConfiguracionNegocio {
  let texto = readFileSync(resolve(process.cwd(), ruta), 'utf8');
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  // AJUSTA si cargarConfiguracion recibe otra cosa (por ejemplo, el texto del JSON)
  return cargarConfiguracion(JSON.parse(texto));
}

export interface Usuario {
  id: string;
  nombre: string;
}

export function esNombreValido(nombre: string): boolean {
  return nombre.trim().length > 0;
}

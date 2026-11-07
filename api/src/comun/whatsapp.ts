const CODIGO_PAIS = '506';

// Costa Rica: 8 dígitos. wa.me necesita el número con código de país y sin signos.
export function normalizarNumeroWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  return digitos.length === 8 ? CODIGO_PAIS + digitos : digitos;
}

export function formatearTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length === 8 ? digitos.slice(0, 4) + '-' + digitos.slice(4) : telefono;
}

export function urlWhatsapp(numero: string, mensaje: string): string {
  return 'https://wa.me/' + normalizarNumeroWhatsapp(numero) + '?text=' + encodeURIComponent(mensaje);
}

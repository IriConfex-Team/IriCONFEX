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

// encodeURIComponent deja sin codificar * ' ( ) ! ~; el asterisco (negrita de WhatsApp) se codifica a mano
const codificar = (texto: string) =>
  encodeURIComponent(texto).replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export function urlWhatsapp(numero: string, mensaje: string): string {
  return 'https://wa.me/' + normalizarNumeroWhatsapp(numero) + '?text=' + codificar(mensaje);
}

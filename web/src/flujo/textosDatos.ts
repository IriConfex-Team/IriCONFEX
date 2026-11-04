import { formatoTelefono, type Negocio } from '@iriconfex/shared'

/** Días que se conservan las solicitudes antes de borrarse (HU-26). */
export const DIAS_RETENCION = 90

/** HU-20 CA1: aviso corto (≤ 120 palabras) con datos recogidos, finalidad y retención. Ley 8968. */
export function avisoDatos(negocio: Negocio): string {
  return (
    `Para preparar tu cotización, ${negocio.nombre} guarda tu nombre, tu teléfono, las opciones que elegiste ` +
    `y, si las indicas, tus medidas. Solo los usa para responder tu solicitud de cotización y confeccionar tu prenda; ` +
    `no los comparte ni los vende. Se borran automáticamente ${DIAS_RETENCION} días después de enviar la solicitud. ` +
    `Puedes pedir que los corrijan o los borren antes escribiendo al WhatsApp ${formatoTelefono(negocio.whatsapp)}.`
  )
}

export const TEXTO_ACEPTACION = 'Leí el aviso y acepto que se usen mis datos para esta solicitud de cotización.'

/** Política completa enlazada desde el aviso (HU-20 CA1). */
export function politicaPrivacidad(negocio: Negocio): { titulo: string; parrafos: string[] }[] {
  const telefono = formatoTelefono(negocio.whatsapp)
  return [
    {
      titulo: 'Quién es responsable',
      parrafos: [
        `${negocio.nombre} (${negocio.direccion}) es responsable de los datos que envías desde esta aplicación. ` +
          `Puedes contactarnos por WhatsApp al ${telefono}.`,
      ],
    },
    {
      titulo: 'Qué datos recogemos',
      parrafos: [
        'Tu nombre y tu número de teléfono, las opciones de la prenda que elegiste y, solo si las escribes, tus medidas ' +
          'y la dirección de envío. No pedimos correo, cédula ni datos de pago.',
      ],
    },
    {
      titulo: 'Para qué los usamos',
      parrafos: [
        'Únicamente para responder tu solicitud de cotización, coordinar la medición o la entrega y confeccionar la prenda. ' +
          'No los usamos para publicidad, no los compartimos con terceros y no los vendemos.',
      ],
    },
    {
      titulo: 'Cuánto tiempo los guardamos',
      parrafos: [
        `Las solicitudes y sus datos se borran automáticamente ${DIAS_RETENCION} días después de enviarse. ` +
          'Ese plazo cubre la cotización, la confección y la entrega.',
      ],
    },
    {
      titulo: 'Tus derechos',
      parrafos: [
        'Según la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales, puedes pedir ' +
          `conocer, corregir o borrar tus datos en cualquier momento escribiendo al WhatsApp ${telefono}.`,
      ],
    },
    {
      titulo: 'Consentimiento',
      parrafos: [
        'Antes de enviar tu solicitud te pedimos que aceptes el aviso de datos. Guardamos esa aceptación y su fecha junto con la solicitud.',
      ],
    },
  ]
}

import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import './rutas.js';
import { registro } from './registro.js';


export function generarDocumento() {
  const generador = new OpenApiGeneratorV31(registro.definitions);
  return generador.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'IriConfex API',
      version: '0.1.0',
      description:
        'API de IriConfex: configurador de pijamas personalizadas. Genera solicitudes de cotización, nunca pedidos.',
    },
    servers: [{ url: '/', description: 'Servidor actual' }],
    tags: [{ name: 'Salud' }, { name: 'Categorías' }, { name: 'Solicitudes' }],
  });
}

export const documentoOpenApi = generarDocumento();
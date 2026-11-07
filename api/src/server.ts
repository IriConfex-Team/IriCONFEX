import { crearApp } from './app.js';
import { leerConfig } from './comun/config.js';
import { crearDependencias } from './contenedor.js';
import { prisma } from './db.js';
import { cargarConfigPijamas } from './comun/configuracion.js';

const config = leerConfig();
const version = process.env.npm_package_version ?? '0.0.0';
const configuracion = cargarConfigPijamas(config.rutaConfiguracion);

const app = crearApp(
  crearDependencias(prisma, {
    version,
    configuracion,
    whatsappNegocio: config.whatsappNegocio,
  }),
  { origenesCors: config.origenesCors },
);

const servidor = app.listen(config.puerto, '0.0.0.0', () => {
  console.log('API lista en http://localhost:' + config.puerto + ' (documentación en /api/docs)');
});

function apagar(senal: string) {
  console.log('Recibida ' + senal + ': cerrando el servidor');
  servidor.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
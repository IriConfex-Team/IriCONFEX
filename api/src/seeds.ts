import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando script de carga de datos (HU-24a)...');

  // 1. Leer el Anexo A (Reglas, perfiles, etc.) desde el archivo existente
  const anexoAPath = path.join(__dirname, 'data', 'categorias', 'pijamas.json');
  const anexoAData = JSON.parse(fs.readFileSync(anexoAPath, 'utf8'));

  // 2. Leer tu nuevo Anexo B (Precios reales por pieza)
  const anexoBPath = path.join(__dirname, 'data', 'anexo_b_precios.json');
  const anexoBData = JSON.parse(fs.readFileSync(anexoBPath, 'utf8'));

  // 3. Cargar Precios del Anexo B de forma Idempotente
  for (const precio of anexoBData.precios_por_pieza) {
    // Se usa un identificador único (ej. la combinación de pieza y tela)
    const uniqueId = `${precio.pieza}_${precio.tela}`.toLowerCase();
    
    await prisma.precioPieza.upsert({
      where: { id: uniqueId }, // Busca si ya existe
      update: { precios_crc: precio.precios_crc }, // Si existe, actualiza precios
      create: { 
        id: uniqueId, 
        pieza: precio.pieza, 
        tela: precio.tela, 
        precios_crc: precio.precios_crc 
      }, // Si no existe, lo crea
    });
  }

  console.log('✅ Carga idempotente completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error al ejecutar el script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// La API debe cargar las variables de entorno (por ejemplo con node --env-file=../.env).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000, // si la base no responde, falla en 10 s en vez de colgarse
});

export const prisma = new PrismaClient({ adapter });
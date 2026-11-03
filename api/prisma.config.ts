import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Busca .env en api/ y, si no existe, en la raíz del repositorio.
dotenv.config({ path: ['.env', '../.env'] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});

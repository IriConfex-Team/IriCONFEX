# syntax=docker/dockerfile:1
FROM node:22-slim

# Dependencias del sistema necesarias para OpenSSL / Prisma
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Dependencias (capa cacheable: instala devDependencies requeridas para el build)
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY shared/package.json shared/package.json
COPY web/package.json web/package.json
RUN npm ci

# 2) Código y Build
COPY shared shared
COPY api api
COPY datos datos

# Compilación de paquetes y generación de base de datos
RUN npm run build --workspace=shared
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build DIRECT_URL=postgresql://build:build@localhost:5432/build npm run db:generate -w api
RUN npm run build --workspace=api

# 3) Ejecución
ENV NODE_ENV=production
USER node
WORKDIR /app/api
EXPOSE 3000

CMD ["node", "dist/src/server.js"]
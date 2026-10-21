# IrICONFIX

Aplicación web de preventa de pijamas personalizadas. Monorepo con npm workspaces:

| Carpeta   | Contenido                                                        |
|-----------|------------------------------------------------------------------|
| `api/`    | API en Node + TypeScript, esquema de Prisma, migraciones y seed  |
| `web/`    | Aplicación web (se despliega en Vercel)                          |
| `shared/` | Código compartido entre `api` y `web`                            |

## Base de datos (T-02)

- **PostgreSQL** + **Prisma 7** (esquema, migraciones versionadas y seed).
- **Desarrollo local:** PostgreSQL en Docker.
- **Producción:** Supabase (PostgreSQL administrado). Las mismas migraciones y el mismo seed se aplican en ambos.
- **30 tablas** en el modelo, más `_prisma_migrations` (31 en total en la base).
- Los secretos viven en variables de entorno; nunca se suben al repositorio.

### Cómo funciona

- **Motor de configuración** (`categoria`, `perfil`, `paso`, `opcion`, `regla`): define los pasos del configurador de pijamas y las reglas de visibilidad y fijación de opciones. La condición de cada regla (con `todas` y `alguna` anidadas) se guarda tal cual en la columna JSON `regla.condicion`.
- **Catálogo y precios** (`tela`, `tipo_pieza`, `adicional`, `columna_precio`, `precio_pieza`, `recargo`, `grupo_talla`, `talla`, `campo_medida`, …): se cargan desde CSV en `api/prisma/data/`.
- **Solicitudes** (`solicitud` y sus tablas hijas `solicitud_pieza`, `solicitud_adicional`, `solicitud_medida`, `solicitud_envio`): lo que genera el cliente. Se borran en cascada.
- **Datos fuera del código:** precios, telas y reglas se editan en los archivos de datos y se recarga con el seed. El seed es **idempotente**: se puede repetir sin duplicar nada.
- **Seguridad por filas (RLS):** activada en todas las tablas. Prisma entra como dueño, así que la API no se ve afectada; solo se bloquea el acceso directo desde el navegador vía Supabase.
- **Retención de datos:** las solicitudes vencen a los 90 días (`fechaVencimiento`). La función `api/src/jobs/eliminarVencidas.ts` las borra y deja registro en `registro_eliminacion`.

### Estructura relevante

```
IriCONFEX/
├── .env.example            # plantilla de variables (se copia a .env)
├── docker-compose.yml      # PostgreSQL + contenedor que migra y carga datos
├── .github/workflows/db-setup.yml
└── api/
    ├── Dockerfile.db
    ├── prisma.config.ts
    ├── prisma/
    │   ├── schema.prisma   # las 30 tablas
    │   ├── seed.ts
    │   ├── migrations/     # historial versionado (se sube a Git)
    │   └── data/           # CSV y JSON del negocio
    ├── generated/prisma/   # lo genera Prisma (ignorado por Git)
    └── src/
        ├── db.ts           # cliente de Prisma
        └── jobs/eliminarVencidas.ts
```

## Requisitos

- [Node.js](https://nodejs.org/) 22.12 o superior (Prisma 7 lo exige)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con Compose v2)
- Git
- Una cuenta de Supabase (solo para producción)

## Instalación local

1. **Clonar e instalar dependencias**

   ```bash
   git clone https://github.com/IriConfex-Team/IriCONFEX.git
   cd IriCONFEX
   npm install
   ```

2. **Crear el `.env`** en la raíz a partir de la plantilla:

   ```bash
   cp .env.example .env          # en PowerShell: Copy-Item .env.example .env
   ```

   Edita `POSTGRES_PASSWORD` y las dos URLs con la misma contraseña. Usa una contraseña sin símbolos especiales (`@ : / #`); si los lleva, hay que codificarlos en la URL.

   ```env
   POSTGRES_USER=iriconfex
   POSTGRES_PASSWORD=tu_clave
   POSTGRES_DB=iriconfex
   DATABASE_URL=postgresql://iriconfex:tu_clave@localhost:5432/iriconfex
   DIRECT_URL=postgresql://iriconfex:tu_clave@localhost:5432/iriconfex
   ```

3. **Levantar todo de una vez** (PostgreSQL, migraciones y seed):

   ```bash
   docker compose up --build -d
   docker compose logs -f db-setup
   ```

   Si todo salió bien, el log termina con `Seed completo` y `db-setup` queda en estado `Exited (0)`. La base sigue corriendo en `localhost:5432`.

### Uso día a día

```bash
npm run db:up        # levanta solo PostgreSQL
npm run db:setup     # aplica migraciones nuevas y recarga los datos
npm run db:down      # apaga (los datos se conservan)
npm run db:reset     # reinicia la base LOCAL (borra todo)
npm run db:studio -w api   # Prisma Studio: ver las tablas en el navegador
docker compose down -v     # apaga y BORRA los datos locales
```

Cuando cambie un precio, una tela o una regla: edita el archivo en `api/prisma/data/` (o el `pijamas.json`) y corre `npm run db:setup`.

### Cambiar el esquema

1. Edita `api/prisma/schema.prisma`.
2. Genera la migración:
   ```bash
   npm run db:migrate -w api -- --name describe_el_cambio
   npm run db:generate -w api
   ```
3. Si agregas tablas nuevas, repite en esa migración el bloque de seguridad por filas (RLS).
4. Sube la carpeta `api/prisma/migrations/` a Git.

### Scripts disponibles

| Script (en `api/`) | Qué hace                                       |
|--------------------|------------------------------------------------|
| `db:generate`      | Genera el cliente de Prisma                    |
| `db:migrate`       | Crea y aplica migraciones (`prisma migrate dev`) |
| `db:deploy`        | Aplica migraciones existentes (`migrate deploy`) |
| `db:seed`          | Carga los datos                                |
| `db:setup`         | `generate` + `migrate deploy` + `seed`         |
| `db:reset`         | Reinicia la base (solo local)                  |
| `db:studio`        | Abre Prisma Studio                             |

Desde la raíz existen `db:up`, `db:down`, `db:setup` y `db:reset`.

## Verificar que quedó bien

```bash
# Esperado: 31 tablas (30 del modelo + _prisma_migrations)
docker compose exec db psql -U iriconfex -d iriconfex -c "select count(*) as tablas from information_schema.tables where table_schema = 'public';"

# Esperado: 150 precios, 7 recargos, 18 tallas, 6 telas, 21 pasos, 104 opciones y 55 reglas
docker compose exec db psql -U iriconfex -d iriconfex -c "select (select count(*) from precio_pieza) as precios, (select count(*) from recargo) as recargos, (select count(*) from talla) as tallas, (select count(*) from tela) as telas, (select count(*) from paso) as pasos, (select count(*) from opcion) as opciones, (select count(*) from regla) as reglas;"
```

Corre `npm run db:setup` otra vez: los números deben seguir iguales (idempotencia).

## Producción (Supabase + Vercel)

1. Crea el proyecto en Supabase y guarda la contraseña de la base.
2. Desde **Connect** copia dos cadenas:
   - `DIRECT_URL`: conexión directa (o Session pooler si tu red no tiene IPv6). Se usa para migraciones y seed.
   - `DATABASE_URL`: Transaction pooler. La usa la API.
3. Aplica migraciones y seed pasando las variables **solo en esa terminal** (no las escribas en `.env`):

   ```powershell
   # PowerShell (Windows)
   $env:DIRECT_URL='postgresql://...'; $env:DATABASE_URL='postgresql://...'; npm run db:setup -w api
   ```
   ```bash
   # Linux / macOS
   DIRECT_URL='postgresql://...' DATABASE_URL='postgresql://...' npm run db:setup -w api
   ```
4. En el Table Editor de Supabase revisa que existan las tablas y que tengan RLS activado.
5. En Vercel configura `DATABASE_URL` (la del pooler) como variable de entorno. El comando de compilación debe ejecutar `prisma generate` antes de compilar, porque `api/generated/` no se sube a Git.

> **Nunca** corras `db:reset` contra Supabase: borra todo.

### Despliegue automático de datos (GitHub Actions)

El workflow `.github/workflows/db-setup.yml` corre `npm run db:setup` contra Supabase cuando se hace push a `main` con cambios en `api/prisma/**`. Requiere el secreto `SUPABASE_DIRECT_URL` en **Settings → Secrets and variables → Actions**.

## Problemas comunes

| Error | Causa y solución |
|-------|------------------|
| `Can't reach database server` (P1001) | La base no está arriba o el puerto 5432 está ocupado. Revisa `docker compose ps`; si hay conflicto, usa `127.0.0.1:5433:5432` en el compose y cambia el puerto en las URLs. |
| `Environment variable not found: DIRECT_URL` | El `.env` no está en la raíz o corriste el comando desde otra carpeta. Usa los scripts con `-w api` desde la raíz. |
| Error de autenticación | Caracteres especiales sin codificar en la URL, o cambiaste `POSTGRES_PASSWORD` después de crear el volumen. Corre `docker compose down -v` y levanta de nuevo. |
| `Cannot find module '../generated/prisma/client'` | Falta generar el cliente: `npm run db:generate -w api`. |
| `ENOENT` al leer `pijamas.json` | `RUTA_PIJAMAS` no apunta al archivo real, o en Docker la carpeta no se copia en `Dockerfile.db`. |
| `Sin catálogo para ...` | El id de la opción no coincide con ningún código de los CSV; agrega la línea en `alias` de `enlaces.json`. |
| `Regla X: no existe la opción ...` | Una condición del `pijamas.json` apunta a un paso u opción con un id mal escrito. |

## Pendiente

- Colores y estampados por tela (`colores.csv`).
- Medidas de referencia por talla y rangos reales de los campos de medida.
- Datos del local, fotos de la galería y descripciones e imágenes de las telas.
- Cantones y distritos (`geo-cr.json`).
- Texto definitivo del aviso de datos personales.
- Programar la tarea diaria de eliminación de solicitudes vencidas.
- Definir la fuente de verdad de la configuración en producción (`pijamas.json` vs. base de datos).
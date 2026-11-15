# IriConfex — Custom Pajama Pre-Sale Configurator

Mobile-first web application that helps an independent seamstress workshop handle custom-pajama quotation requests. Customers go through a rule-driven configuration wizard, get an estimated price calculated from validated business tables, and send a structured, pre-filled WhatsApp message (`wa.me`). The seamstress never has to operate an administration panel.

> Technical decisions are documented in [docs/ADR.md](./docs/ADR.md).

## Table of contents

1. [Problem and solution](#1-problem-and-solution)
2. [System architecture](#2-system-architecture)
3. [Data model](#3-data-model)
4. [Repository structure](#4-repository-structure)
5. [Prerequisites and environment variables](#5-prerequisites-and-environment-variables)
6. [Local installation](#6-local-installation)
7. [REST API and testing](#7-rest-api-and-testing)
8. [Production deployment](#8-production-deployment)
9. [Technical decisions](#9-technical-decisions)
10. [Troubleshooting](#10-troubleshooting)
11. [Known limitations](#11-known-limitations)

---

## 1. Problem and solution

**Problem.** Quoting custom garments through unstructured WhatsApp chats is slow, depends on memory for tailoring restrictions and price tables, and is awkward on a phone.

**Solution.** A declarative, data-driven configurator. Business rules, fabrics, colors, size charts and base prices live in versioned data files and are loaded idempotently into PostgreSQL. A shared rule engine evaluates valid combinations in real time in the browser, and the API re-validates them on the server before storing a quote request and returning a pre-filled WhatsApp link.

---

## 2. System architecture

The project is an **npm workspaces TypeScript monorepo**:

| Folder    | Description |
|-----------|-------------|
| `web/`    | Mobile-first React + TypeScript + Vite single-page app (deployed on Vercel) |
| `api/`    | Node.js + Express 5 + TypeScript REST API, Prisma 7 schema, migrations and seed (deployed on Render) |
| `shared/` | Domain types, Zod schemas and the declarative rule engine, shared by `api` and `web` |
| `datos/`  | Versioned category configuration (`datos/categorias/pijamas.json`) |

```mermaid
flowchart TB
    User["Customer<br/>(mobile browser)"]

    subgraph Vercel ["Vercel"]
        Web["web<br/>React + TypeScript + Vite SPA"]
    end

    subgraph Render ["Render (Docker)"]
        Api["api<br/>Express 5 + Zod + OpenAPI"]
    end

    subgraph Supabase ["Supabase"]
        Db[("PostgreSQL<br/>RLS enabled")]
    end

    Shared["shared<br/>types, Zod schemas, rule engine"]
    GHA["GitHub Actions<br/>CI, db-setup, keep-alive, retention"]
    WA["WhatsApp<br/>wa.me link"]

    User --> Web
    Web -->|"HTTPS / JSON"| Api
    Api -->|"Prisma 7"| Db
    Web -.->|"imports"| Shared
    Api -.->|"imports"| Shared
    GHA -->|"db-setup: migrations + seed"| Db
    GHA -->|"keep-alive (/api/health) and daily retention job"| Api
    Web -->|"opens pre-filled message"| WA
```

**Request flow**

1. The web app loads a category's full configuration (steps, options, rules, measurements) from `GET /api/categorias/:codigo`.
2. The shared rule engine shows or hides options and applies fixed values as the customer moves through the wizard.
3. The web app calls `POST /api/quotes` to get a server-side price estimate.
4. On submit, `POST /api/solicitudes` re-validates the selection and shipping data, stores the request, and returns the pre-filled `wa.me` URL.
5. The customer's browser opens WhatsApp with the structured message.

---

## 3. Data model

- **Engine:** PostgreSQL + Prisma 7 (versioned migrations and idempotent seed).
- **Size:** 30 tables in the model, plus `_prisma_migrations` (31 in the database).

| Area | Tables |
|------|--------|
| Configuration engine | `categoria`, `perfil`, `paso`, `opcion`, `regla`, `regla_opcion_afectada` |
| Catalog and pricing | `tela`, `color`, `tipo_pieza`, `adicional`, `columna_precio`, `precio_pieza`, `recargo` |
| Sizing and measurements | `grupo_talla`, `talla`, `perfil_grupo_talla`, `campo_medida`, `talla_medida_ref` |
| Business content and privacy | `negocio`, `galeria_foto`, `aviso_privacidad`, `registro_eliminacion` |
| Geography (Costa Rica) | `provincia`, `canton`, `distrito` |
| Customer requests | `solicitud`, `solicitud_pieza`, `solicitud_adicional`, `solicitud_medida`, `solicitud_envio` |

**How it works**

- **Configuration engine:** defines the wizard steps and the visibility and fixing rules. Each rule belongs to a step (`regla.pasoId`), lists the options it affects in `regla_opcion_afectada`, and stores its condition (with nested `todas` and `alguna`) as-is in the JSON column `regla.condicion`.
- **Pricing:** a base price exists per piece type, fabric and price column (`precio_pieza`); additional items add a surcharge per price column (`recargo`). Each amount carries a state (`CONFIRMADO`, `ESTIMADO` or `PENDIENTE`). Sizes map to a price column.
- **Requests:** `solicitud` uses a UUID primary key and a unique 16-character `referencia`. Its child tables (`solicitud_pieza`, `solicitud_adicional`, `solicitud_medida`, `solicitud_envio`) are deleted in cascade.
- **Data outside the code:** prices, fabrics and rules are edited in the data files and reloaded with the seed. The seed is **idempotent**: it can be repeated without duplicating anything.
- **Row-Level Security (RLS):** enabled on all tables. Prisma connects as the table owner, so the API is unaffected; only direct browser access through Supabase's public API is blocked.
- **Data retention (Costa Rica Law 8968):** requests expire after 90 days (`solicitud.fechaVencimiento`). `api/src/jobs/eliminarVencidas.ts` deletes them and logs each run in `registro_eliminacion`. A scheduled GitHub Actions workflow runs it daily through a protected API endpoint.

### Entity-relationship diagrams

**Configuration, catalog and pricing**

```mermaid
erDiagram
    CATEGORIA ||--o{ PERFIL : has
    CATEGORIA ||--o{ PASO : defines
    CATEGORIA ||--o{ CAMPO_MEDIDA : "measurement fields"
    PASO ||--o{ OPCION : contains
    PASO ||--o{ REGLA : "rules of"
    REGLA ||--o{ REGLA_OPCION_AFECTADA : affects
    OPCION ||--o{ REGLA_OPCION_AFECTADA : "affected by"
    PERFIL ||--o{ PERFIL_GRUPO_TALLA : allows
    GRUPO_TALLA ||--o{ PERFIL_GRUPO_TALLA : "allowed in"
    PERFIL ||--o{ GALERIA_FOTO : shows

    PERFIL |o--o{ OPCION : "limits (optional)"
    TELA |o--o{ OPCION : "selects (optional)"
    TIPO_PIEZA |o--o{ OPCION : "selects (optional)"
    GRUPO_TALLA |o--o{ OPCION : "selects (optional)"
    TALLA |o--o{ OPCION : "selects (optional)"
    ADICIONAL |o--o{ OPCION : "selects (optional)"

    TELA ||--o{ COLOR : "comes in"
    TELA ||--o{ PRECIO_PIEZA : priced
    TIPO_PIEZA ||--o{ PRECIO_PIEZA : priced
    COLUMNA_PRECIO ||--o{ PRECIO_PIEZA : "price column"
    ADICIONAL ||--o{ RECARGO : surcharge
    COLUMNA_PRECIO ||--o{ RECARGO : "price column"
    GRUPO_TALLA ||--o{ TALLA : groups
    COLUMNA_PRECIO ||--o{ TALLA : "maps to"
    TALLA ||--o{ TALLA_MEDIDA_REF : "reference value"
    CAMPO_MEDIDA ||--o{ TALLA_MEDIDA_REF : "reference value"

    CATEGORIA {
        int id PK
        string codigo UK
        string versionConfiguracion
        boolean activa
    }
    PERFIL {
        int id PK
        int categoriaId FK
        string codigo
        boolean permiteMedida
    }
    PASO {
        int id PK
        int categoriaId FK
        string codigo
        string pieza
        int orden
    }
    OPCION {
        int id PK
        int pasoId FK
        string codigo
        int perfilId FK "optional"
        int telaId FK "optional"
        int tipoPiezaId FK "optional"
        int grupoTallaId FK "optional"
        int tallaId FK "optional"
        int adicionalId FK "optional"
    }
    REGLA {
        int id PK
        int pasoId FK
        string codigo
        string tipo
        json condicion
    }
    TELA {
        int id PK
        string codigo UK
        decimal factorConsumo
        boolean soloHolgada
    }
    COLOR {
        int id PK
        int telaId FK
        string clave
        string tipo
        string nombre
    }
    PRECIO_PIEZA {
        int id PK
        int tipoPiezaId FK
        int telaId FK
        int columnaPrecioId FK
        int montoCrc
        string estado
    }
    RECARGO {
        int id PK
        int adicionalId FK
        int columnaPrecioId FK
        int montoCrc
        string estado
    }
    TALLA {
        int id PK
        int grupoTallaId FK
        int columnaPrecioId FK
        string codigo
    }
    CAMPO_MEDIDA {
        int id PK
        int categoriaId FK
        string codigo
        string seccion
        decimal valorMin
        decimal valorMax
        boolean provisional
    }
```

**Customer requests, privacy and geography**

```mermaid
erDiagram
    PERFIL ||--o{ SOLICITUD : "requested for"
    AVISO_PRIVACIDAD ||--o{ SOLICITUD : "accepted notice"
    COLUMNA_PRECIO |o--o{ SOLICITUD : "price column"
    SOLICITUD ||--o{ SOLICITUD_PIEZA : includes
    SOLICITUD ||--o{ SOLICITUD_ADICIONAL : adds
    SOLICITUD ||--o{ SOLICITUD_MEDIDA : records
    SOLICITUD ||--o| SOLICITUD_ENVIO : "ships to"
    TIPO_PIEZA ||--o{ SOLICITUD_PIEZA : "piece type"
    TELA ||--o{ SOLICITUD_PIEZA : fabric
    TALLA |o--o{ SOLICITUD_PIEZA : size
    COLOR |o--o{ SOLICITUD_PIEZA : color
    ADICIONAL ||--o{ SOLICITUD_ADICIONAL : extra
    CAMPO_MEDIDA ||--o{ SOLICITUD_MEDIDA : "measured field"
    PROVINCIA ||--o{ CANTON : has
    CANTON ||--o{ DISTRITO : has
    DISTRITO ||--o{ SOLICITUD_ENVIO : "delivery district"

    SOLICITUD {
        uuid id PK
        string referencia UK
        int perfilId FK
        string nombreCliente
        string telefono
        json selecciones
        string entrega
        int precioEstimadoCrc
        int avisoId FK
        datetime avisoAceptadoEn
        datetime fechaVencimiento
    }
    SOLICITUD_PIEZA {
        int id PK
        uuid solicitudId FK
        string rol
        int tipoPiezaId FK
        int telaId FK
        int tallaId FK "optional"
        int colorId FK "optional"
        int montoCrc
    }
    SOLICITUD_MEDIDA {
        int id PK
        uuid solicitudId FK
        int campoMedidaId FK
        decimal valorCm
    }
    SOLICITUD_ENVIO {
        uuid solicitudId PK, FK
        int distritoId FK
        string senas
    }
    AVISO_PRIVACIDAD {
        int id PK
        string version UK
        boolean vigente
    }
    NEGOCIO {
        int id PK
        string nombre
        string whatsapp
    }
    REGISTRO_ELIMINACION {
        int id PK
        datetime fechaEjecucion
        int cantidadEliminada
    }
```

---

## 4. Repository structure

```
IriCONFEX/
├── .env.example                  # Environment variables template (copy to .env)
├── docker-compose.yml            # Local PostgreSQL + db-setup container + API
├── .github/workflows/            # CI, keep-alive, db-setup and retention workflows
├── docs/ADR.md                   # Architecture Decision Records
├── datos/categorias/pijamas.json # Declarative steps, options and rules
├── shared/                       # Shared types, Zod schemas and rule engine
├── web/                          # React + TypeScript + Vite frontend
└── api/
    ├── Dockerfile                # Production API image (build context: repo root)
    ├── Dockerfile.db             # Migration and seed container
    ├── prisma.config.ts
    ├── prisma/
    │   ├── schema.prisma         # The 30 tables
    │   ├── seed.ts               # Idempotent catalog and pricing loader
    │   ├── seed-colores.ts       # Idempotent fabric color loader
    │   ├── migrations/           # Versioned SQL migrations (committed to Git)
    │   └── data/                 # Business CSV and JSON data
    ├── generated/prisma/         # Generated Prisma client (gitignored)
    └── src/
        ├── db.ts                 # Prisma client
        ├── modulos/              # Layered modules (routes, controllers, services, repositories)
        └── jobs/eliminarVencidas.ts
```

---

## 5. Prerequisites and environment variables

### Prerequisites

- [Node.js](https://nodejs.org/) 22.12 or higher (required by Prisma 7)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose v2)
- Git
- A Supabase account (production only)

### Environment variables

Copy the template to `.env` in the repository root. **Never commit `.env`.**

```bash
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
```

Use a password without special URL characters (`@ : / #`); if it has any, URL-encode them.

| Variable | Required | Description | Local example |
|----------|----------|-------------|---------------|
| `POSTGRES_USER` | Local | PostgreSQL user | `iriconfex` |
| `POSTGRES_PASSWORD` | Local | PostgreSQL password (must match the two URLs below) | `your_password` |
| `POSTGRES_DB` | Local | PostgreSQL database name | `iriconfex` |
| `DATABASE_URL` | Yes | Connection string used by the API (Session pooler in production) | `postgresql://iriconfex:your_password@localhost:5432/iriconfex` |
| `DIRECT_URL` | Yes | Direct connection used for migrations and seed | `postgresql://iriconfex:your_password@localhost:5432/iriconfex` |
| `PORT` | No | API port (3000 by default) | `3000` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins, no trailing `/` (empty = none). Local: the Vite app. Production: the Vercel https URL | `http://localhost:5173` |
| `RUTA_CONFIG` | Yes | Path to the category configuration file used by the API, relative to `api/` | `../datos/categorias/pijamas.json` |
| `WHATSAPP_NEGOCIO` | No | Business WhatsApp number (8 digits). Only needed if `pijamas.json` has no `negocio` block with it | `88888888` |
| `VITE_API_URL` | Yes (web) | Public URL of the API, without trailing slash and without `/api` | `http://localhost:3000` |

---

## 6. Local installation

### Setup with Docker (recommended)

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/IriConfex-Team/IriCONFEX.git
   cd IriCONFEX
   npm install
   ```

2. **Create `.env`** from the template (see [section 5](#5-prerequisites-and-environment-variables)).

3. **Start everything** (PostgreSQL, migrations, seed and the API at http://localhost:3000):

   ```bash
   docker compose up --build -d
   docker compose logs -f db-setup
   ```

   When it succeeds, the log ends with `Seed completo` and `db-setup` shows `Exited (0)`. The database keeps running on `localhost:5432`.

4. **Start the frontend** (http://localhost:5173):

   ```bash
   npm run dev:web
   ```

### Day-to-day commands

```bash
npm run dev:web            # frontend with hot reload
npm run dev:api            # API with auto-reload (stop the API container first: both use port 3000)
npm run db:up              # start PostgreSQL only
npm run db:setup           # apply new migrations and reload data
npm run db:down            # stop (data is kept)
npm run db:reset           # reset the LOCAL database (wipes everything)
npm run db:studio -w api   # Prisma Studio: browse tables in the browser
docker compose down -v     # stop and DELETE local data
```

When a price, fabric or rule changes, edit the file in `api/prisma/data/` (or `datos/categorias/pijamas.json`) and run `npm run db:setup`.

### Changing the schema

1. Edit `api/prisma/schema.prisma`.
2. Generate the migration:

   ```bash
   npm run db:migrate -w api -- --name describe_the_change
   npm run db:generate -w api
   ```

3. If you add new tables, repeat the Row-Level Security (RLS) block in that migration.
4. Commit the `api/prisma/migrations/` folder to Git.

### Available scripts

| Script (in `api/`) | What it does |
|--------------------|--------------|
| `db:generate` | Generates the Prisma client |
| `db:migrate` | Creates and applies migrations (`prisma migrate dev`) |
| `db:deploy` | Applies existing migrations (`migrate deploy`) |
| `db:seed` | Loads the data |
| `db:setup` | `generate` + `migrate deploy` + `seed` |
| `db:reset` | Resets the database (local only) |
| `db:studio` | Opens Prisma Studio |

From the repository root: `dev:web`, `dev:api`, `build`, `lint`, `typecheck`, `test`, `db:up`, `db:down`, `db:setup` and `db:reset`.

### Verifying the database

```bash
# Expected: 31 tables (30 from the model + _prisma_migrations)
docker compose exec db psql -U iriconfex -d iriconfex -c "select count(*) as tablas from information_schema.tables where table_schema = 'public';"

# Expected: 150 prices, 7 surcharges, 18 sizes, 6 fabrics, 21 steps, 104 options and 55 rules
docker compose exec db psql -U iriconfex -d iriconfex -c "select (select count(*) from precio_pieza) as precios, (select count(*) from recargo) as recargos, (select count(*) from talla) as tallas, (select count(*) from tela) as telas, (select count(*) from paso) as pasos, (select count(*) from opcion) as opciones, (select count(*) from regla) as reglas;"
```

Run `npm run db:setup` again: the numbers must stay the same (idempotency).

### Testing on a phone

On the same network, open `http://<YOUR-PC-LAN-IP>:5173` (web) or `http://<YOUR-PC-LAN-IP>:3000/api/docs` (API docs). Ports 5173 and 3000 must be allowed in your OS firewall.

---

## 7. REST API and testing

Express 5 + Zod + OpenAPI 3.1, organized in routes, controllers, services and repositories (`api/src/modulos/<module>/`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API and database status (200 or 503) |
| GET | `/api/categorias` | List of active categories |
| GET | `/api/categorias/:codigo` | One category with its steps, options, rules and measurements |
| GET | `/api/colores` | Available colors and prints per fabric (`?tela=...`) |
| POST | `/api/quotes` | Server-side price estimate for a validated selection |
| POST | `/api/solicitudes` | Validates selection and shipping data, stores the request, returns the pre-filled `wa.me` URL |
| GET | `/api/docs` | Interactive documentation (Swagger UI) |
| GET | `/api/openapi.json` | OpenAPI 3.1 specification |

**API scripts**

```bash
npm run dev -w api      # dev server with auto-reload
npm run build -w api    # compile
npm run start -w api    # run the compiled server (requires build)
npm test -w api         # Vitest + Supertest
```

**Quality checks** (also run by the GitHub Actions CI on every pull request)

```bash
npm run lint         # ESLint in every workspace
npm run typecheck    # strict TypeScript check in every workspace
npm test             # test suites of every workspace (rule engine, API, web)
npm run build        # production build of every workspace
```

To run the tests of a single workspace: `npm test -w shared`, `npm test -w api` or `npm test -w web`.

---

## 8. Production deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Database | Supabase | PostgreSQL with RLS enabled on all tables |
| API | Render | Docker image built from `api/Dockerfile` (build context: repository root) |
| Web | Vercel | Deployed from `web/`, with `VITE_API_URL` pointing to the Render URL |
| Automation | GitHub Actions | CI, database setup and keep-alive |

### Database (Supabase)

1. Create the project in Supabase and save the database password.
2. From **Connect**, copy two connection strings:
   - `DIRECT_URL`: direct connection (or Session pooler if your network has no IPv6). Used for migrations and seed.
   - `DATABASE_URL`: Session pooler. Used by the API.
3. Apply migrations and seed, passing the variables **only in that terminal** (do not write them in `.env`):

   ```powershell
   # PowerShell (Windows)
   $env:DIRECT_URL='postgresql://...'; $env:DATABASE_URL='postgresql://...'; npm run db:setup -w api
   ```

   ```bash
   # Linux / macOS
   DIRECT_URL='postgresql://...' DATABASE_URL='postgresql://...' npm run db:setup -w api
   ```

4. In the Supabase Table Editor, check that the tables exist and have RLS enabled.

> **Never** run `db:reset` against Supabase: it wipes everything.

### API (Render)

- Web service built from `api/Dockerfile` (context: repository root). Health: `/api/health`. Docs: `/api/docs`.
- Environment variables: `NODE_ENV=production`, `DATABASE_URL` (Supabase Session pooler), `CORS_ORIGINS` (only the frontend's https domain, no trailing `/`), `RUTA_CONFIG`, and `WHATSAPP_NEGOCIO` if needed (see [section 5](#5-prerequisites-and-environment-variables)).
- `api/generated/` is not committed, so the image build must run `prisma generate` before compiling.
- To test the image locally: `docker build -f api/Dockerfile -t iriconfex-api .`

### Web (Vercel)

Deploy from `web/` and set `VITE_API_URL` to the Render API URL.

### GitHub Actions

- `.github/workflows/db-setup.yml` runs `npm run db:setup` against Supabase on every push to `main` that changes `api/prisma/**`. It needs the secret `SUPABASE_DIRECT_URL` (**Settings → Secrets and variables → Actions**).
- `.github/workflows/keep-alive.yml` calls `/api/health` every 10 minutes. This avoids Render's idle spin-down (15 minutes) and Supabase's inactivity pause (7 days). It needs the repository variable `API_HEALTH_URL`.
- A scheduled retention workflow runs every day and calls a protected API endpoint, which executes the `eliminarVencidas` job. The job deletes requests past their `fechaVencimiento` (90 days) and logs the run in `registro_eliminacion`.

---

## 9. Technical decisions

Full context, alternatives and consequences are in [docs/ADR.md](./docs/ADR.md).

| ADR | Decision |
|-----|----------|
| ADR-001 | TypeScript monorepo with a rule engine shared by `web` and `api` |
| ADR-002 | Declarative, data-driven configuration with no admin panel |
| ADR-003 | PostgreSQL on Supabase with Prisma 7 and Row-Level Security |
| ADR-004 | Dockerized Express 5 API on Render with a keep-alive workflow |
| ADR-005 | Data minimization and retention aligned with Costa Rica Law 8968 |

---

## 10. Troubleshooting

| Error | Cause and fix |
|-------|---------------|
| `Can't reach database server` (P1001) | The database is not running or port 5432 is taken. Check `docker compose ps`; if there is a conflict, use `127.0.0.1:5433:5432` in the compose file and change the port in the URLs. |
| `Environment variable not found: DIRECT_URL` | `.env` is not in the repository root, or the command ran from another folder. Run the scripts with `-w api` from the root. |
| Authentication error | Unencoded special characters in the URL password, or `POSTGRES_PASSWORD` was changed after the volume was created. Run `docker compose down -v` and start again. |
| `Cannot find module '../generated/prisma/client'` | The Prisma client has not been generated. Run `npm run db:generate -w api`. |
| `ENOENT` when reading `pijamas.json` | `RUTA_CONFIG` does not point to the real file, or in Docker the folder is not copied in `Dockerfile.db`. |
| `Sin catálogo para ...` | The option id does not match any code in the CSV files. Add the line under `alias` in `enlaces.json`. |
| `Regla X: no existe la opción ...` | A condition in the category JSON points to a step or option with a misspelled id. |

---

## 11. Known limitations

These items depend on business data or decisions that are still pending, not on code.

- **Measurements.** Reference body measurements per size and the exact min/max validation ranges (`campos-medida.csv`) are pending confirmation by the client.
- **Business assets.** Final workshop address, business hours, reference gallery photos (HU-02), and fabric photos and descriptions are pending client assets.
- **Privacy notice.** The final legal wording of the personal data notice (`aviso.json`) is pending.
- **Configuration source of truth.** Whether production reads `pijamas.json` or the database as the source of truth is not yet defined.

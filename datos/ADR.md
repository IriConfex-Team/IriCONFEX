# Architecture Decision Records (ADR) — IriConfex

Each record follows the same format: context, decision, alternatives considered and consequences.

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](#adr-001-typescript-monorepo-with-a-shared-rule-engine) | TypeScript monorepo with a shared rule engine | Accepted |
| [ADR-002](#adr-002-declarative-data-driven-configuration-no-admin-panel) | Declarative, data-driven configuration (no admin panel) | Accepted |
| [ADR-003](#adr-003-postgresql-on-supabase-with-prisma-7-and-row-level-security) | PostgreSQL on Supabase with Prisma 7 and RLS | Accepted |
| [ADR-004](#adr-004-dockerized-express-5-api-on-render-with-keep-alive-workflow) | Dockerized Express 5 API on Render with keep-alive workflow | Accepted |
| [ADR-005](#adr-005-costa-rica-data-protection-compliance-law-8968) | Costa Rica data protection compliance (Law 8968) | Accepted |

---

## ADR-001: TypeScript monorepo with a shared rule engine

**Status:** Accepted

**Context.** The business rules (R1–R10) must filter garment options instantly on mobile devices, and the same rules must be enforced on the server before a quote is calculated or stored.

**Decision.** Use npm workspaces with three TypeScript packages: `web`, `api` and `shared`. Domain types, Zod schemas and the rule evaluation engine live in `shared` and are imported by both `web` and `api`.

**Alternatives considered.**
- Separate repositories with the rules implemented twice (client and server).
- Server-only validation, with the client asking the API for every change.

**Consequences.**
- No duplicated business logic between client and server.
- Compile-time type safety across the API boundary.
- The rule engine can be unit-tested in isolation.
- All packages must be built and versioned together, which fits a small team.

---

## ADR-002: Declarative, data-driven configuration (no admin panel)

**Status:** Accepted

**Context.** The seamstress must not need to do any task outside WhatsApp (RN-06). The catalog must be maintainable without deploying the application (RN-07), and adding a category or changing a rule must not require programming (RN-08). Configuration and prices must also stay separate from the code (RNF-08).

**Decision.** Store profiles, steps, options, conditional rules (as JSON), fabrics, colors, measurements and price tables in versioned JSON and CSV files (`datos/` and `api/prisma/data/`), loaded into PostgreSQL by idempotent Prisma seed scripts (`upsert`). The application code interprets this configuration and does not embed garment, fabric or price data.

**Alternatives considered.**
- A web admin panel (CMS) to edit prices, fabrics and rules.
- Hardcoding the configuration in the application code.

**Consequences.**
- Catalog, price and rule updates are data changes, applied with the seed (`npm run db:setup`, or the `db-setup` workflow on push to `main`) without changing application code.
- Every change goes through Git review and keeps a history.
- Edits require basic Git and command-line knowledge, which the development team provides.
- Open point: the production source of truth (the JSON file read through `RUTA_CONFIG` vs. the database) is not yet defined. It determines whether a catalog change needs an API redeploy (RN-07).

---

## ADR-003: PostgreSQL on Supabase with Prisma 7 and Row-Level Security

**Status:** Accepted

**Context.** The system needs relational integrity across 30 tables, structured JSON conditions for rules, and cloud hosting within a zero-cost budget (RNF-11).

**Decision.** Use PostgreSQL hosted on Supabase's free tier, accessed through Prisma 7 with versioned migrations. Enable Row-Level Security (RLS) on every table. Local development uses PostgreSQL in Docker with the same migrations and seed.

**Alternatives considered.**
- A document database, which fits the relational pricing and request data less well.
- SQLite, which does not match the production engine.

**Consequences.**
- Schema evolution is tracked and reproducible.
- Direct browser access to the Supabase tables is blocked; only the API (which connects as table owner) can read and write.
- Local and production environments behave the same.
- Every new table must repeat the RLS block in its migration.
- The free tier pauses after 7 days of inactivity (see ADR-004).

---

## ADR-004: Dockerized Express 5 API on Render with keep-alive workflow

**Status:** Accepted

**Context.** The backend must validate combinations, compute estimated prices (`POST /api/quotes`), generate non-sequential quote references (RNF-13) and stay responsive within a zero infrastructure budget. Free tiers suspend idle services: Render after 15 minutes and Supabase after 7 days.

**Decision.** Package the API in a Docker image deployed on Render (build context: repository root). A scheduled GitHub Actions workflow (`keep-alive.yml`) calls `/api/health` every 10 minutes; since the health check queries the database, it also keeps Supabase active. The web app is deployed separately on Vercel.

**Alternatives considered.**
- Serverless functions on Vercel, which would split the API and complicate the Prisma connection handling.
- Accepting cold starts on the free tier.

**Consequences.**
- Same containerized runtime locally and in the cloud.
- Avoids cold starts and database inactivity pauses without paid plans.
- Depends on a GitHub Actions schedule, so the `API_HEALTH_URL` repository variable must stay configured.

---

## ADR-005: Costa Rica data protection compliance (Law 8968)

**Status:** Accepted

**Context.** Customers provide their name, an 8-digit phone number and, for delivery, a shipping destination: a district (which belongs to a canton and a province) plus address details (`senas`). This is personal data under Costa Rica's Law 8968 (HU-20).

**Decision.**
- Apply data minimization: no shipping data is collected for store pickup (`entrega = RETIRO`).
- Require explicit consent to the privacy notice before a request is submitted (HU-20). Each request stores the accepted notice version (`avisoId`) and the acceptance time (`avisoAceptadoEn`).
- Make requests non-guessable (RNF-13): a UUID primary key and a unique 16-character `referencia`, instead of sequential ids.
- Limit retention to 90 days with the `fechaVencimiento` column (indexed). The `eliminarVencidas` job deletes expired requests, with their child rows deleted in cascade, and logs each run in `registro_eliminacion` (HU-26). A scheduled GitHub Actions workflow runs the job daily by calling a protected API endpoint.

**Alternatives considered.**
- Keeping requests indefinitely for analytics.
- Collecting the shipping address for every request.

**Consequences.**
- Smaller privacy exposure and a clear, auditable retention policy.
- Customers lose their request history after 90 days.
- Retention is enforced without manual work, but it depends on the daily scheduled workflow running: if a run fails, expired requests stay until the next successful run.

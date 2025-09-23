# DB_Additions

This document explains the database auto‑provisioning feature: what was added, how it works, env vars, fallbacks, and troubleshooting.

## Overview
- Purpose: Connect to Postgres with host/user/password, ensure the target database and schema exist. If missing, the app creates the DB and applies migrations automatically at startup.
- Outcome: No manual SQL prerequisites. You only need valid DB credentials and the DB server IP/hostname.

## Files added
- `app/utils/dbProvision.server.ts`
  - `ensureDatabase({ host, port, user, password, database, ssl })`
    - Connects to admin DB (`postgres`) to check/create the target database.
    - Connects to the target DB and runs migrations.
  - `runMigrations(client, migrationsDir)`
    - Ensures `public.schema_migrations` exists.
    - Discovers `.sql` files in order and applies them with checksum tracking (idempotent).
    - Executes statements one‑by‑one and logs failures to help pinpoint SQL errors.
    - Resolves the migrations directory relative to the file (robust to CWD changes).
    - Fallback: if no migrations are found, it will attempt to run a sanitized `PG_V2.sql` or `PG.sql` (see below).

- `app/schemas/migrations/001_init.sql`
  - Initial schema creation for:
    - `workspaces`, `boards`, `groups`, `columns`, `rows`, `cells`, `updates`
    - Auth tables: `user`, `session`, `account`, `verification`
  - Derived from `app/schemas/PG_V2.sql`, with server‑level commands removed.
  - Note: `ALTER TABLE rows ADD CONSTRAINT check_level_zero_no_parent ...` intentionally does not use `IF NOT EXISTS` for wide Postgres compatibility.

## Files changed
- `app/utils/pool.server.ts`
  - Calls `ensureDatabase(...)` before creating the `Pool` (automatic, idempotent provisioning on startup).
  - Honors `PG_PORT` and `PG_SSL` when creating the pool.
- `node-env.d.ts`
  - Added typings for `PG_PORT` and `PG_SSL`.
- `app/components/Cell.tsx`
  - Minor type safety for the updates cell display.

## Fallback behavior (when no migrations are present)
If `app/schemas/migrations/` contains no `.sql` files, the app will try to apply:
1. `app/schemas/PG_V2.sql`, else
2. `app/schemas/PG.sql`

Before execution, the fallback file is sanitized:
- Removes psql meta commands like `\c`, `\dt`, `\l`.
- Removes server‑level statements like `CREATE DATABASE ...`.
Then it is executed statement‑by‑statement within a transaction and recorded in `schema_migrations` using the file name and checksum.

## Required environment variables
- `PG_HOST` (required): Postgres server host/IP
- `PG_USER` (required): User with permission to connect to `postgres` and ideally `CREATEDB`
- `PG_PASSWORD` (required): Password for `PG_USER`
- `PG_DATABASE` (required): Target database name (created if missing)
- `PG_PORT` (optional): Defaults to `5432`
- `PG_SSL` (optional): Set to `"true"` to enable SSL (current pool uses `{ rejectUnauthorized: false }` for broad compatibility)

You can set these in your shell or via a `.env` file (depending on how you load env vars in dev/prod).

## How it runs at startup
1. `pool.server.ts` calls `ensureDatabase({...env})`.
2. `ensureDatabase` creates the DB if missing.
3. `runMigrations` applies `app/schemas/migrations/*.sql` in order, or falls back to `PG_V2.sql` / `PG.sql` as needed.
4. The app creates the `Pool` and proceeds.

Console logs prefixed with `[db]` provide visibility: migration directory, each file applied, and any statement errors.

## Verify provisioning locally (PowerShell)
Set env vars (example) and start dev:

```powershell
$env:PG_HOST = "127.0.0.1"
$env:PG_USER = "postgres"
$env:PG_PASSWORD = "your_password"
$env:PG_DATABASE = "tuesday"
$env:PG_PORT = "5432"
$env:PG_SSL = "false"
pnpm run dev
```

On first run, you should see `[db]` logs and the schema created. Subsequent runs will skip already‑applied migrations.

## Adding future migrations
- Add a new `.sql` file under `app/schemas/migrations/` with a higher prefix, e.g. `002_seed_defaults.sql`.
- Keep statements idempotent where practical (`IF NOT EXISTS`, guarded `ALTER`s, etc.).
- Restart the server; the new migration will run once and be recorded.

## Troubleshooting
- Error: `syntax error at or near "NOT"` during `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS ...`
  - Cause: Some Postgres versions don’t support `IF NOT EXISTS` on `ADD CONSTRAINT`.
  - Fix: We removed `IF NOT EXISTS` in `001_init.sql` to ensure compatibility.

- No tables created, only database created
  - Check `[db]` logs on startup for which migrations ran.
  - Ensure `app/schemas/migrations/` exists and contains files, or confirm the fallback `PG_V2.sql` / `PG.sql` exists.
  - If fallback runs, confirm its sanitized statements reflect the intended schema.

- SSL issues
  - If your server requires SSL, set `PG_SSL=true`. For strict cert verification, adjust the pool configuration to provide CA/keys as needed.

## Security & permissions
- Prefer a dedicated DB user with only required privileges. Provisioning requires `CREATEDB` unless the database already exists.
- Credentials are used only server‑side; do not expose them to the client.

## Rollback / opt‑out
- To disable auto‑provisioning, remove/comment the `ensureDatabase(...)` call in `app/utils/pool.server.ts`.
- You can continue to run against a pre‑provisioned database.

## Optional follow‑ups
- Seed defaults (statuses/priorities) via `002_seed_defaults.sql`.
- Add indexes in `003_indexes.sql` for common queries.
- Protected tRPC mutation to trigger provisioning on demand (useful for multi‑tenant setups or debugging).
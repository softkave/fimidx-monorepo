# fimidx-core

## Postgres migrations

### Apply schema migrations

From `fimidx-monorepo/fimidx-core`:

```bash
pnpm db:migrate:postgres
pnpm db:migrate:auth
```

Required env:

- `FIMIDX_POSTGRES_URL`: Postgres connection string for fimidx tables (`emailRecord`, `emailBlockList`, `objField`, and optionally `objs`)
- `AUTH_POSTGRES_URL`: Postgres connection string for auth tables (`user`, `account`, `session`, etc.)

### One-time Turso (SQLite) → Postgres data migration (fimidx auxiliary tables)

This copies the following tables from Turso to Postgres:

- `emailRecord`
- `emailBlockList`
- `objField`

Run **after** `pnpm db:migrate:postgres`.

From `fimidx-monorepo/fimidx-core`:

```bash
# Optional: preview counts only (no writes)
DRY_RUN=true FIMIDX_TURSO_URL="..." FIMIDX_TURSO_AUTH_TOKEN="..." pnpm db:migrate:postgres:data

# Copy data (non-destructive by default)
FIMIDX_TURSO_URL="..." FIMIDX_TURSO_AUTH_TOKEN="..." pnpm db:migrate:postgres:data

# If you want to wipe destination tables first
TRUNCATE_DEST=true FIMIDX_TURSO_URL="..." FIMIDX_TURSO_AUTH_TOKEN="..." pnpm db:migrate:postgres:data
```

Required env (for this script only):

- `FIMIDX_POSTGRES_URL`: destination Postgres DB
- `FIMIDX_TURSO_URL`: source Turso database URL (libSQL/SQLite)
- `FIMIDX_TURSO_AUTH_TOKEN`: source Turso auth token

Script: `src/scripts/migrateFimidxTursoToPostgres.ts`

### One-time Turso (SQLite) → Postgres data migration (auth)

If you still have legacy auth data in Turso, migrate it to auth Postgres:

```bash
# Optional: preview counts only (no writes)
DRY_RUN=true AUTH_TURSO_URL="..." AUTH_TURSO_AUTH_TOKEN="..." pnpm db:migrate:auth:data

# Copy data
AUTH_TURSO_URL="..." AUTH_TURSO_AUTH_TOKEN="..." pnpm db:migrate:auth:data

# If you want to wipe destination tables first
TRUNCATE_DEST=true AUTH_TURSO_URL="..." AUTH_TURSO_AUTH_TOKEN="..." pnpm db:migrate:auth:data
```

Required env (for this script only):

- `AUTH_POSTGRES_URL`: destination Postgres DB for auth tables
- `AUTH_TURSO_URL`: source Turso database URL (libSQL/SQLite)
- `AUTH_TURSO_AUTH_TOKEN`: source Turso auth token

Script: `src/scripts/migrateAuthTursoToPostgres.ts`


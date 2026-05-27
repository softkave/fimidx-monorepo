import { defineConfig } from "drizzle-kit";

const fimidxPostgresUrl = process.env.FIMIDX_POSTGRES_URL;

if (!fimidxPostgresUrl) {
  throw new Error("FIMIDX_POSTGRES_URL is not set");
}

export default defineConfig({
  out: "./drizzle/fimidx/postgres",
  schema: "./src/db/fimidx.postgres.schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: fimidxPostgresUrl,
  },
  migrations: {
    table: "__drizzle_migrations", // `__drizzle_migrations` by default
    schema: "public", // used in PostgreSQL only, `drizzle` by default
  },
});

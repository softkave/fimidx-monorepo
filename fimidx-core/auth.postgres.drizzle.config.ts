import { defineConfig } from "drizzle-kit";

const authPostgresUrl = process.env.AUTH_POSTGRES_URL;

if (!authPostgresUrl) {
  throw new Error("AUTH_POSTGRES_URL is not set");
}

export default defineConfig({
  out: "./drizzle/auth/postgres",
  schema: "./src/db/auth.postgres.schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: authPostgresUrl,
  },
  migrations: {
    table: "__drizzle_migrations_auth",
    schema: "public",
  },
});

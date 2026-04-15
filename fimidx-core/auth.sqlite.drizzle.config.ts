import { defineConfig } from "drizzle-kit";

const fimidxTursoUrl = process.env.AUTH_TURSO_URL;
const fimidxTursoAuthToken = process.env.AUTH_TURSO_AUTH_TOKEN;

if (!fimidxTursoUrl) {
  throw new Error("AUTH_TURSO_URL is not set");
}
if (!fimidxTursoAuthToken) {
  throw new Error("AUTH_TURSO_AUTH_TOKEN is not set");
}

export default defineConfig({
  out: "./drizzle/auth/sqlite",
  schema: "./src/db/auth.sqlite.schema.ts",
  dialect: "turso",
  dbCredentials: {
    authToken: fimidxTursoAuthToken,
    url: fimidxTursoUrl,
  },
});

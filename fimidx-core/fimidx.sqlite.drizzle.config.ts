import { defineConfig } from "drizzle-kit";

const fimidxTursoUrl = process.env.FIMIDX_TURSO_URL;
const fimidxTursoAuthToken = process.env.FIMIDX_TURSO_AUTH_TOKEN;

if (!fimidxTursoUrl) {
  throw new Error("FIMIDX_TURSO_URL is not set");
}
if (!fimidxTursoAuthToken) {
  throw new Error("FIMIDX_TURSO_AUTH_TOKEN is not set");
}

export default defineConfig({
  out: "./drizzle/fimidx/sqlite",
  schema: "./src/db/fimidx.sqlite.schema.ts",
  dialect: "turso",
  dbCredentials: {
    authToken: fimidxTursoAuthToken,
    url: fimidxTursoUrl,
  },
});

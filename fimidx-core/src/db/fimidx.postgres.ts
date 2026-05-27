import { drizzle } from "drizzle-orm/node-postgres";
import { getCoreConfig } from "../common/getCoreConfig.js";
import * as schema from "./fimidx.postgres.schema.js";

const { postgres } = getCoreConfig();

export const db = drizzle(postgres.url, { schema });

/** @deprecated Use `db` — kept for existing tests that reference this name. */
export const fimidxPostgresDb = db;

export {
  emailBlockLists,
  emailRecords,
  objFields,
  objs,
} from "./fimidx.postgres.schema.js";

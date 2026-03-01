import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getCoreConfig } from "../common/getCoreConfig.js";
import {
  emailBlockLists,
  emailRecords,
  objFields,
} from "./fimidx.sqlite.schema.js";

const { turso } = getCoreConfig();

const fimidxClient = createClient({
  authToken: turso.authToken,
  url: turso.url,
});

export const db = drizzle(fimidxClient);

export { emailBlockLists, emailRecords, objFields };

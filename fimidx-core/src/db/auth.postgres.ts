import { drizzle } from "drizzle-orm/node-postgres";
import { getCoreConfig } from "../common/getCoreConfig.js";

const { auth } = getCoreConfig();

export const authDb = drizzle(auth.postgres.url);

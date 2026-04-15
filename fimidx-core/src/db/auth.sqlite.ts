import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getCoreConfig } from "../common/getCoreConfig.js";

const { auth } = getCoreConfig();

const authClient = createClient({
  authToken: auth.turso.authToken,
  url: auth.turso.url,
});

export const authDb = drizzle(authClient);

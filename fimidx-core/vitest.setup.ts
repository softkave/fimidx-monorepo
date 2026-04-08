import { closeMongoConnection } from "./src/db/fimidx.mongo.js";
import {
  clearMongoCollections,
  clearSQLiteTables,
} from "./src/vitest/setup.js";

export async function setup() {
  await clearSQLiteTables();
  await clearMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
  // await cleanupFimidaraSourceMapsFolder();
}

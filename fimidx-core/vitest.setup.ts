import { closeMongoConnection } from "./src/db/fimidx.mongo.js";
import {
  clearAllMongoCollections,
  clearAllSQLiteTables,
} from "./src/vitest/setup.js";

export async function setup() {
  await clearAllSQLiteTables();
  await clearAllMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
  // await cleanupFimidaraSourceMapsFolder();
}

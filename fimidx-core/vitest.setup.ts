import { closeMongoConnection } from "./src/db/fimidx.mongo.js";
import {
  clearMongoCollections,
  clearPostgresTables,
} from "./src/vitest/setup.js";

export async function setup() {
  await clearPostgresTables();
  await clearMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
  // await cleanupFimidaraSourceMapsFolder();
}

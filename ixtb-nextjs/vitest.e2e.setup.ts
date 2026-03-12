import { closeMongoConnection } from "fimidx-core/db/fimidx.mongo";
import {
  clearAllMongoCollections,
  clearAllSQLiteTables,
} from "fimidx-core/vitest/setup";

export async function setup() {
  await clearAllSQLiteTables();
  await clearAllMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
}

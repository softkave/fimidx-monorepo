import { closeMongoConnection } from "fimidx-core/db/fimidx.mongo";
import {
  clearMongoCollections,
  clearSQLiteTables,
} from "fimidx-core/vitest/setup";

export async function setup() {
  await clearSQLiteTables();
  await clearMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
}

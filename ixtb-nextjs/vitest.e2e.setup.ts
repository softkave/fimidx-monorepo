import { closeMongoConnection } from "fimidx-core/db/fimidx.mongo";
import {
  clearMongoCollections,
  clearPostgresTables,
} from "fimidx-core/vitest/setup";

export async function setup() {
  await clearPostgresTables();
  await clearMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
}

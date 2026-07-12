import { closeMongoConnection } from "fimidx-core/db/fimidx.mongo";
import { clearMongoCollections } from "fimidx-core/vitest/setup";

export async function setup() {
  await clearMongoCollections();
}

export async function teardown() {
  await closeMongoConnection();
}

import { Schema } from "mongoose";
import type { ISeedEnvTestState } from "../definitions/seedEnvTestState.js";
import { getMongoConnection } from "./fimidx.mongo.js";

const seedEnvTestStateSchema = new Schema<ISeedEnvTestState>(
  {
    key: { type: String, required: true, unique: true, index: true },
    groupId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    clientToken: { type: String, required: false },
    symRepo: { type: String, required: false },
    symVersion: { type: String, required: false },
    seededByUserId: { type: String, required: true },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true, collection: "seed_fimidx_js_env_test_state" }
);

export function getSeedEnvTestStateModel() {
  const { connection } = getMongoConnection();
  return connection.model<ISeedEnvTestState>(
    "SeedEnvTestState",
    seedEnvTestStateSchema
  );
}

export const kSeedEnvTestStateKey = "default";

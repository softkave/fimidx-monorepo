import assert from "assert";
import { createConnection, Schema } from "mongoose";
import { getCoreConfig } from "../common/getCoreConfig.js";
import type { IObj } from "../definitions/obj.js";

let connection: ReturnType<typeof createConnection> | null = null;
let promise: Promise<ReturnType<typeof createConnection>> | null = null;

export function getMongoConnection() {
  if (!connection) {
    const { mongo } = getCoreConfig();
    const uri = mongo.uri;
    const dbName = mongo.dbName;
    assert.ok(uri, "MONGO_URI is not set");
    assert.ok(dbName, "MONGO_DB_NAME is not set");
    connection = createConnection(uri, { dbName });
    promise = connection.asPromise();
  }
  return { connection, promise };
}

export const objSchema = new Schema<IObj>({
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String, index: true },
  updatedBy: { type: String, index: true },
  groupId: { type: String, index: true },
  appId: { type: String, index: true },
  createdByType: { type: String, index: true },
  id: { type: String, unique: true },
  tag: { type: String, index: true },
  updatedByType: { type: String, index: true },
  objRecord: Schema.Types.Map,
  deletedAt: { type: Date, index: true },
  deletedBy: { type: String, index: true },
  deletedByType: { type: String, index: true },
  shouldIndex: { type: Boolean, default: true },
  fieldsToIndex: { type: [String], index: true },
});

const modelName = "obj";
const collectionName = "objs";

export function getObjModel() {
  const { connection } = getMongoConnection();
  const model = connection.model<IObj>(modelName, objSchema, collectionName);
  return model;
}

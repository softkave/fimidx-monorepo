import assert from "assert";
import { createConnection, Schema } from "mongoose";
import { getCoreConfig } from "../common/getCoreConfig.js";
import type { IObj } from "../definitions/obj.js";

let connection: ReturnType<typeof createConnection> | null = null;
let promise: Promise<ReturnType<typeof createConnection>> | null = null;
/** Bumped whenever the underlying connection is (re)created. */
let connectionGeneration = 0;

function isConnectionUnusable(
  conn: ReturnType<typeof createConnection>
): boolean {
  // 0 = disconnected, 3 = disconnecting, 99 = uninitialized
  return (
    conn.readyState === 0 || conn.readyState === 3 || conn.readyState === 99
  );
}

export function getMongoConnection() {
  if (!connection || isConnectionUnusable(connection)) {
    const { mongo } = getCoreConfig();
    const uri = mongo.uri;
    const dbName = mongo.dbName;
    assert.ok(uri, "MONGO_URI is not set");
    assert.ok(dbName, "MONGO_DB_NAME is not set");
    connection = createConnection(uri, { dbName });
    connectionGeneration += 1;
    const generation = connectionGeneration;
    promise = connection.asPromise().catch((err) => {
      // Drop the dead handle so the next caller opens a fresh connection.
      if (connectionGeneration === generation) {
        connection = null;
        promise = null;
      }
      throw err;
    });
  }
  return { connection, promise, connectionGeneration };
}

export async function closeMongoConnection() {
  if (connection) {
    await connection.close();
    connection = null;
    promise = null;
  }
}

export const objSchema = new Schema<IObj>({
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String, index: true },
  updatedBy: { type: String, index: true },
  groupId: { type: String, index: true },
  projectId: { type: String, index: true },
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

import assert from "assert";
import { Types } from "mongoose";
import { OwnServerError } from "../common/error.js";
import { getMongoConnection } from "../db/fimidx.mongo.js";

type UserDoc = Record<string, unknown> & {
  _id?: Types.ObjectId | string;
};

async function getUsersCollection() {
  const { connection, promise } = getMongoConnection();
  await promise;
  assert.ok(connection?.db, new OwnServerError("User store not found", 500));
  return connection.db.collection<UserDoc>("user");
}

/**
 * User identity is Mongo `_id` (ObjectId), exposed as a hex string `id`.
 * Better Auth maps `_id` → `user.id`, and app refs (session userId, member
 * meta.userId, monitor reportsTo) all store that same hex string.
 */
function normalizeUser(user: UserDoc) {
  const id = user._id != null ? String(user._id) : "";
  assert.ok(id.length > 0, new OwnServerError("User is missing id", 500));

  return {
    ...user,
    id,
  };
}

function toObjectIdOrNull(id: string): Types.ObjectId | null {
  try {
    return Types.ObjectId.createFromHexString(id);
  } catch {
    return null;
  }
}

async function findUsersByIds(userIds: string[]): Promise<UserDoc[]> {
  const objectIds = userIds
    .map(toObjectIdOrNull)
    .filter((id): id is Types.ObjectId => id != null);

  if (objectIds.length === 0) {
    return [];
  }

  return (await getUsersCollection())
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function getUserByUsername(username: string): Promise<any> {
  const user = await (await getUsersCollection()).findOne({ name: username });

  assert.ok(user, new OwnServerError("User not found", 404));
  return normalizeUser(user);
}

export async function tryGetUserByEmail(email: string): Promise<any> {
  const user = await (
    await getUsersCollection()
  ).findOne({ email: email.toLowerCase() });
  return user ? normalizeUser(user) : null;
}

export async function getUserById(id: string): Promise<any> {
  const [user] = await findUsersByIds([id]);
  assert.ok(user, new OwnServerError("User not found", 404));
  return normalizeUser(user);
}

export async function getUsers(userIds: string[]): Promise<any[]> {
  const users = await findUsersByIds(userIds);
  return users.map((user) => normalizeUser(user));
}

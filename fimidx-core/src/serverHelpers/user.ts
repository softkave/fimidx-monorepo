import assert from "assert";
import { OwnServerError } from "../common/error.js";
import { getMongoConnection } from "../db/fimidx.mongo.js";

async function getUsersCollection() {
  const { connection, promise } = getMongoConnection();
  await promise;
  assert.ok(connection?.db, new OwnServerError("User store not found", 500));
  return connection.db.collection("user");
}

export async function getUserByUsername(username: string): Promise<any> {
  const user = await (await getUsersCollection()).findOne({ name: username });

  assert.ok(user, new OwnServerError("User not found", 404));
  return user;
}

export async function tryGetUserByEmail(email: string): Promise<any> {
  return await (
    await getUsersCollection()
  ).findOne({
    email: email.toLowerCase(),
  });
}

export async function getUserById(id: string): Promise<any> {
  const user = await (await getUsersCollection()).findOne({ id });

  assert.ok(user, new OwnServerError("User not found", 404));
  return user;
}

export async function getUsers(userIds: string[]): Promise<any[]> {
  const users = await (await getUsersCollection())
    .find({ id: { $in: userIds } })
    .toArray();

  return users;
}

import assert from "assert";
import { eq, inArray } from "drizzle-orm";
import { OwnServerError } from "../common/error.js";
import { authDb, users as usersTable } from "../db/auth-schema.js";

export async function getUserByUsername(username: string) {
  const user = await authDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.name, username))
    .then((result) => result[0]);

  assert.ok(user, new OwnServerError("User not found", 404));
  return user;
}

export async function tryGetUserByEmail(email: string) {
  const users = await authDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .then((result) => result);

  const user = users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  return user ?? null;
}

export async function getUserById(id: string) {
  const user = await authDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .then((result) => result[0]);

  assert.ok(user, new OwnServerError("User not found", 404));
  return user;
}

export async function getUsers(userIds: string[]) {
  const users = await authDb
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));

  return users;
}

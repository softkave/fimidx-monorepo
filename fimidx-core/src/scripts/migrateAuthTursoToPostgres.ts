import { createClient } from "@libsql/client";
import { count, sql } from "drizzle-orm";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import {
  accounts as pgAccounts,
  authenticators as pgAuthenticators,
  sessions as pgSessions,
  users as pgUsers,
  verificationTokens as pgVerificationTokens,
} from "../db/auth.postgres.schema.js";
import {
  accounts as sqliteAccounts,
  authenticators as sqliteAuthenticators,
  sessions as sqliteSessions,
  users as sqliteUsers,
  verificationTokens as sqliteVerificationTokens,
} from "./authTurso.schema.js";

const BATCH_SIZE = 500;

function toDate(value: number | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function toPgBool(value: number | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value !== 0;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const sqliteTableCountFns = {
  user: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteUsers)
      .then((r) => r[0].c),
  account: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteAccounts)
      .then((r) => r[0].c),
  session: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteSessions)
      .then((r) => r[0].c),
  verificationToken: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteVerificationTokens)
      .then((r) => r[0].c),
  authenticator: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteAuthenticators)
      .then((r) => r[0].c),
} as const;

const pgTableCountFns = {
  user: (db: ReturnType<typeof drizzlePg>) =>
    db
      .select({ c: count() })
      .from(pgUsers)
      .then((r) => r[0].c),
  account: (db: ReturnType<typeof drizzlePg>) =>
    db
      .select({ c: count() })
      .from(pgAccounts)
      .then((r) => r[0].c),
  session: (db: ReturnType<typeof drizzlePg>) =>
    db
      .select({ c: count() })
      .from(pgSessions)
      .then((r) => r[0].c),
  verificationToken: (db: ReturnType<typeof drizzlePg>) =>
    db
      .select({ c: count() })
      .from(pgVerificationTokens)
      .then((r) => r[0].c),
  authenticator: (db: ReturnType<typeof drizzlePg>) =>
    db
      .select({ c: count() })
      .from(pgAuthenticators)
      .then((r) => r[0].c),
} as const;

async function truncateDestTables(destDb: ReturnType<typeof drizzlePg>) {
  await destDb.execute(
    sql.raw(
      'TRUNCATE TABLE "authenticator", "verificationToken", "session", "account", "user" CASCADE'
    )
  );
}

async function main() {
  const authTursoUrl = requireEnv("AUTH_TURSO_URL");
  const authTursoAuthToken = requireEnv("AUTH_TURSO_AUTH_TOKEN");
  const authPostgresUrl = requireEnv("AUTH_POSTGRES_URL");
  const dryRun = process.env.DRY_RUN === "true";
  const truncateDest = process.env.TRUNCATE_DEST === "true";

  const sourceClient = createClient({
    url: authTursoUrl,
    authToken: authTursoAuthToken,
  });
  const sourceDb = drizzleLibsql(sourceClient);
  const destDb = drizzlePg(authPostgresUrl);

  const tableNames = [
    "user",
    "account",
    "session",
    "verificationToken",
    "authenticator",
  ] as const;

  console.log("Source (Turso) row counts:");
  for (const table of tableNames) {
    console.log(`  ${table}: ${await sqliteTableCountFns[table](sourceDb)}`);
  }

  console.log("Destination (Postgres) row counts:");
  for (const table of tableNames) {
    try {
      console.log(`  ${table}: ${await pgTableCountFns[table](destDb)}`);
    } catch {
      console.log(
        `  ${table}: (table may not exist yet — run db:migrate:auth first)`
      );
    }
  }

  if (dryRun) {
    console.log("DRY_RUN=true — skipping data copy.");
    return;
  }

  if (truncateDest) {
    console.log("TRUNCATE_DEST=true — truncating destination auth tables...");
    await truncateDestTables(destDb);
  }

  const sourceUsers = await sourceDb.select().from(sqliteUsers);
  console.log(`Copying ${sourceUsers.length} users...`);
  for (let i = 0; i < sourceUsers.length; i += BATCH_SIZE) {
    const batch = sourceUsers.slice(i, i + BATCH_SIZE).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: toDate(row.emailVerified),
      image: row.image,
    }));
    await destDb.insert(pgUsers).values(batch).onConflictDoNothing();
  }

  const sourceAccounts = await sourceDb.select().from(sqliteAccounts);
  console.log(`Copying ${sourceAccounts.length} accounts...`);
  for (let i = 0; i < sourceAccounts.length; i += BATCH_SIZE) {
    await destDb
      .insert(pgAccounts)
      .values(sourceAccounts.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }

  const sourceSessions = await sourceDb.select().from(sqliteSessions);
  console.log(`Copying ${sourceSessions.length} sessions...`);
  for (let i = 0; i < sourceSessions.length; i += BATCH_SIZE) {
    const batch = sourceSessions.slice(i, i + BATCH_SIZE).map((row) => ({
      sessionToken: row.sessionToken,
      userId: row.userId,
      expires: toDate(row.expires) as Date,
    }));
    await destDb.insert(pgSessions).values(batch).onConflictDoNothing();
  }

  const sourceTokens = await sourceDb.select().from(sqliteVerificationTokens);
  console.log(`Copying ${sourceTokens.length} verification tokens...`);
  for (let i = 0; i < sourceTokens.length; i += BATCH_SIZE) {
    const batch = sourceTokens.slice(i, i + BATCH_SIZE).map((row) => ({
      identifier: row.identifier,
      token: row.token,
      expires: toDate(row.expires) as Date,
    }));
    await destDb
      .insert(pgVerificationTokens)
      .values(batch)
      .onConflictDoNothing();
  }

  const sourceAuthenticators = await sourceDb
    .select()
    .from(sqliteAuthenticators);
  console.log(`Copying ${sourceAuthenticators.length} authenticators...`);
  for (let i = 0; i < sourceAuthenticators.length; i += BATCH_SIZE) {
    const batch = sourceAuthenticators.slice(i, i + BATCH_SIZE).map((row) => ({
      credentialID: row.credentialID,
      userId: row.userId,
      providerAccountId: row.providerAccountId,
      credentialPublicKey: row.credentialPublicKey,
      counter: row.counter,
      credentialDeviceType: row.credentialDeviceType,
      credentialBackedUp: toPgBool(row.credentialBackedUp),
      transports: row.transports,
    }));
    await destDb.insert(pgAuthenticators).values(batch).onConflictDoNothing();
  }

  console.log("Verifying row counts...");
  let mismatch = false;
  for (const table of tableNames) {
    const sourceCount = await sqliteTableCountFns[table](sourceDb);
    const destCount = await pgTableCountFns[table](destDb);
    const ok = sourceCount === destCount;
    console.log(
      `  ${table}: source=${sourceCount} dest=${destCount} ${
        ok ? "OK" : "MISMATCH"
      }`
    );
    if (!ok) mismatch = true;
  }

  if (mismatch) {
    throw new Error("Row count mismatch after migration");
  }

  console.log("Auth data migration completed successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

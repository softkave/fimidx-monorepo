/**
 * One-time data migration from Turso (SQLite) to Postgres for email/objField tables.
 *
 * Required env (not part of runtime config — set only when running this script):
 *   FIMIDX_TURSO_URL, FIMIDX_TURSO_AUTH_TOKEN, FIMIDX_POSTGRES_URL
 *
 * Optional: DRY_RUN=true, TRUNCATE_DEST=true
 *
 * Run after schema migration: pnpm db:migrate:postgres
 */
import { createClient } from "@libsql/client";
import { count, sql } from "drizzle-orm";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import {
  emailBlockLists as pgEmailBlockLists,
  emailRecords as pgEmailRecords,
  objFields as pgObjFields,
} from "../db/fimidx.postgres.schema.js";
import {
  emailBlockLists as sqliteEmailBlockLists,
  emailRecords as sqliteEmailRecords,
  objFields as sqliteObjFields,
} from "./fimidxTurso.schema.js";

const BATCH_SIZE = 500;

function toDate(value: number | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  return new Date(value as number);
}

function toPgBool(value: number | boolean): boolean {
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
  emailRecord: (db: ReturnType<typeof drizzleLibsql>) =>
    db.select({ c: count() }).from(sqliteEmailRecords).then((r) => r[0].c),
  emailBlockList: (db: ReturnType<typeof drizzleLibsql>) =>
    db
      .select({ c: count() })
      .from(sqliteEmailBlockLists)
      .then((r) => r[0].c),
  objField: (db: ReturnType<typeof drizzleLibsql>) =>
    db.select({ c: count() }).from(sqliteObjFields).then((r) => r[0].c),
} as const;

const pgTableCountFns = {
  emailRecord: (db: ReturnType<typeof drizzlePg>) =>
    db.select({ c: count() }).from(pgEmailRecords).then((r) => r[0].c),
  emailBlockList: (db: ReturnType<typeof drizzlePg>) =>
    db.select({ c: count() }).from(pgEmailBlockLists).then((r) => r[0].c),
  objField: (db: ReturnType<typeof drizzlePg>) =>
    db.select({ c: count() }).from(pgObjFields).then((r) => r[0].c),
} as const;

async function truncateDestTables(destDb: ReturnType<typeof drizzlePg>) {
  await destDb.execute(
    sql.raw(
      'TRUNCATE TABLE "emailBlockList", "emailRecord", "objField" CASCADE'
    )
  );
}

async function main() {
  const fimidxTursoUrl = requireEnv("FIMIDX_TURSO_URL");
  const fimidxTursoAuthToken = requireEnv("FIMIDX_TURSO_AUTH_TOKEN");
  const fimidxPostgresUrl = requireEnv("FIMIDX_POSTGRES_URL");
  const dryRun = process.env.DRY_RUN === "true";
  const truncateDest = process.env.TRUNCATE_DEST === "true";

  const sourceClient = createClient({
    url: fimidxTursoUrl,
    authToken: fimidxTursoAuthToken,
  });
  const sourceDb = drizzleLibsql(sourceClient);
  const destDb = drizzlePg(fimidxPostgresUrl);

  const tableNames = ["emailRecord", "emailBlockList", "objField"] as const;

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
        `  ${table}: (table may not exist yet — run db:migrate:postgres first)`
      );
    }
  }

  if (dryRun) {
    console.log("DRY_RUN=true — skipping data copy.");
    return;
  }

  if (truncateDest) {
    console.log("TRUNCATE_DEST=true — truncating destination fimidx tables...");
    await truncateDestTables(destDb);
  }

  const sourceEmailRecords = await sourceDb.select().from(sqliteEmailRecords);
  console.log(`Copying ${sourceEmailRecords.length} email records...`);
  for (let i = 0; i < sourceEmailRecords.length; i += BATCH_SIZE) {
    const batch = sourceEmailRecords.slice(i, i + BATCH_SIZE).map((row) => ({
      id: row.id,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
      from: row.from,
      to: row.to,
      subject: row.subject,
      status: row.status,
      reason: row.reason,
      params: row.params,
      provider: row.provider,
      response: row.response,
      senderError: row.senderError,
      serverError: row.serverError,
      callerId: row.callerId,
    }));
    await destDb.insert(pgEmailRecords).values(batch).onConflictDoNothing();
  }

  const sourceBlockLists = await sourceDb.select().from(sqliteEmailBlockLists);
  console.log(`Copying ${sourceBlockLists.length} email block list rows...`);
  for (let i = 0; i < sourceBlockLists.length; i += BATCH_SIZE) {
    const batch = sourceBlockLists.slice(i, i + BATCH_SIZE).map((row) => ({
      id: row.id,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
      email: row.email,
      justifyingEmailRecordId: row.justifyingEmailRecordId,
      reason: row.reason,
    }));
    await destDb.insert(pgEmailBlockLists).values(batch).onConflictDoNothing();
  }

  const sourceObjFields = await sourceDb.select().from(sqliteObjFields);
  console.log(`Copying ${sourceObjFields.length} obj fields...`);
  for (let i = 0; i < sourceObjFields.length; i += BATCH_SIZE) {
    const batch = sourceObjFields.slice(i, i + BATCH_SIZE).map((row) => ({
      id: row.id,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
      projectId: row.projectId,
      groupId: row.groupId,
      path: row.path,
      type: row.type,
      arrayTypes: row.arrayTypes,
      isArrayCompressed: toPgBool(row.isArrayCompressed),
      tag: row.tag,
    }));
    await destDb.insert(pgObjFields).values(batch).onConflictDoNothing();
  }

  console.log("Verifying row counts...");
  let mismatch = false;
  for (const table of tableNames) {
    const sourceCount = await sqliteTableCountFns[table](sourceDb);
    const destCount = await pgTableCountFns[table](destDb);
    const ok = sourceCount === destCount;
    console.log(
      `  ${table}: source=${sourceCount} dest=${destCount} ${ok ? "OK" : "MISMATCH"}`
    );
    if (!ok) mismatch = true;
  }

  if (mismatch) {
    throw new Error("Row count mismatch after migration");
  }

  console.log("Fimidx Turso → Postgres data migration completed successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

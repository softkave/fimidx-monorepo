import { exec } from "child_process";
import { promisify } from "util";
import {
  closeMongoConnection,
  getMongoConnection,
} from "./src/db/fimidx.mongo.js";
// import { fimidxPostgresDb as postgresDb } from "./src/db/fimidx.postgres.js";
import { db as sqliteDb } from "./src/db/fimidx.sqlite.js";

const promisifiedExec = promisify(exec);

async function deleteAllSQLiteTables() {
  console.log("Deleting all SQLite tables");
  const tables = await sqliteDb.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table'`
  );
  for (const table of tables) {
    await sqliteDb.run(`DROP TABLE IF EXISTS ${table.name}`);
  }
  console.log("Done deleting all SQLite tables");
}

// async function deleteAllPostgresTables() {
//   console.log("Deleting all Postgres tables");
//   const result = await postgresDb.execute<{ table_name: string }>(
//     `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
//   );
//   for (const table of result.rows) {
//     await postgresDb.execute(`DROP TABLE IF EXISTS ${table.table_name}`);
//   }
//   console.log("Done deleting all Postgres tables");
// }

async function deleteAllMongoCollections() {
  console.log("Deleting all Mongo collections");
  const { connection, promise } = await getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) {
    throw new Error("Mongo connection not found");
  }
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop(); // eslint-disable-line no-await-in-loop
  }
  console.log("Done deleting all Mongo collections");
}

async function runMigrationsForSQLDbsUsingShell() {
  // const postgresMigrationCommand = "pnpm db:migrate:postgres:test";
  const sqliteMigrationCommand =
    'env-cmd -f ".env.test" npx drizzle-kit migrate --config=fimidx.sqlite.drizzle.config.ts';
  const commands = [
    // postgresMigrationCommand,
    sqliteMigrationCommand,
  ];
  for (const command of commands) {
    console.log(`Running ${command}`);
    const result = await promisifiedExec(command);
    if (result.stderr) {
      console.error(result.stderr);
    }
    console.log(result.stdout);
    console.log(`Done running ${command}`);
  }
}

export async function setup() {
  await deleteAllSQLiteTables();
  // await deleteAllPostgresTables();
  await deleteAllMongoCollections();

  // if (postgresDb.$client instanceof Pool) {
  //   await postgresDb.$client.end();
  // }

  await runMigrationsForSQLDbsUsingShell();
}

export async function teardown() {
  // await deleteAllSQLiteTables();
  // await deleteAllPostgresTables();
  // await deleteAllMongoCollections(true);
  // if (postgresDb.$client instanceof Pool) {
  //   await postgresDb.$client.end();
  // }

  await closeMongoConnection();
}

import { exec } from "child_process";
import { fimidaraAddRootnameToPath } from "fimidara";
import { promisify } from "util";
import { getMongoConnection } from "../db/fimidx.mongo.js";
import {
  getFimidaraEndpoints,
  getFimidaraRootname,
  getFimidaraSourceMapsFolderpath,
} from "../serverHelpers/index.js";

/**
 * Deletes all rows from auxiliary Postgres tables in the correct order to
 * respect foreign key constraints.
 */
export async function clearPostgresTables() {
  try {
    const { db, emailBlockLists, emailRecords, objFields } = await import(
      "../db/fimidx.postgres.js"
    );
    await db.delete(emailBlockLists);
    await db.delete(emailRecords);
    await db.delete(objFields);
  } catch (err) {
    console.warn("Skipping Postgres table cleanup (not available)", err);
  }
}

export async function clearMongoCollections() {
  console.log("Clearing all Mongo collections");
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

  console.log("Done clearing all Mongo collections");
}

const promisifiedExec = promisify(exec);
export async function runMigrationsForSQLDbsUsingShell() {
  const postgresMigrationCommand =
    'env-cmd -f ".env.test" npx drizzle-kit migrate --config=fimidx.postgres.drizzle.config.ts';
  const commands = [postgresMigrationCommand];
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

export async function cleanupFimidaraSourceMapsFolder() {
  const rootname = getFimidaraRootname();
  const sourceMapsFolderpath = getFimidaraSourceMapsFolderpath();
  const endpoints = getFimidaraEndpoints();
  const folderpath = fimidaraAddRootnameToPath(sourceMapsFolderpath, [
    rootname,
  ]);
  try {
    await endpoints.folders.deleteFolder({ folderpath });
    console.log(
      `Successfully cleaned up fimidara source maps folderpath ${folderpath}`
    );
  } catch (error: unknown) {
    console.error(
      `Failed to clean up fimidara source maps folderpath ${folderpath}`,
      error
    );
  }
}

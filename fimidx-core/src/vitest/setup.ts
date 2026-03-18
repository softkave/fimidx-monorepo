import { exec } from "child_process";
import { fimidaraAddRootnameToPath } from "fimidara";
import { promisify } from "util";
import { getMongoConnection } from "../db/fimidx.mongo.js";
import {
  db,
  emailBlockLists,
  emailRecords,
  objFields,
} from "../db/fimidx.sqlite.js";
import {
  getFimidaraEndpoints,
  getFimidaraRootname,
  getFimidaraSourceMapsFolderpath,
} from "../serverHelpers/index.js";

/**
 * Deletes all rows from all tables in the correct order to respect foreign key
 * constraints. emailBlockLists references emailRecords, so it must be deleted
 * first.
 */
export async function clearAllSQLiteTables() {
  await db.delete(emailBlockLists);
  await db.delete(emailRecords);
  await db.delete(objFields);
}

export async function clearAllMongoCollections() {
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
  const sqliteMigrationCommand =
    'env-cmd -f ".env.test" npx drizzle-kit migrate --config=fimidx.sqlite.drizzle.config.ts';
  const commands = [sqliteMigrationCommand];
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
      `Successfully cleaned up Fimidara source maps folderpath ${folderpath}`
    );
  } catch (error: unknown) {
    console.error(
      `Failed to clean up Fimidara source maps folderpath ${folderpath}`,
      error
    );
  }
}

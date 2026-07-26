import {
  closeMongoConnection,
  getMongoConnection,
} from "fimidx-core/db/fimidx.mongo";
import { indexObjs } from "fimidx-core/serverHelpers/index";

/**
 * Deletes all `objField` documents, marks objs for reindex, then rebuilds
 * fields via indexObjs (new field ids use prefixObjId(kObjTags.objField, ...)).
 */
async function main(): Promise<void> {
  const { connection, promise } = getMongoConnection();
  await promise;
  const db = connection.db;
  if (!db) {
    throw new Error("Mongo connection is not available");
  }

  const deleteResult = await db.collection("objField").deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} objField document(s).`);

  const now = new Date();
  const markResult = await db.collection("objs").updateMany(
    { deletedAt: null },
    {
      $set: {
        shouldIndex: true,
        updatedAt: now,
      },
    }
  );
  console.log(
    `Marked ${markResult.modifiedCount} obj(s) for reindex (matched ${markResult.matchedCount}).`
  );

  console.log("Rebuilding obj fields…");
  await indexObjs({ lastSuccessAt: null });
  console.log("Rebuild complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoConnection();
  });

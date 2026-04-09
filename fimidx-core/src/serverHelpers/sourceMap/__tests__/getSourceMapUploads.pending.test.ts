import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMongoConnection } from "../../../db/fimidx.mongo.js";
import {
  getSourceMapUploadModel,
} from "../../../db/sourceMap.mongo.js";
import {
  getSourceMapUploadsPendingUnzipPage,
  markSourceMapUploadLocalZipIngested,
} from "../getSourceMapUploads.js";
import { upsertSourceMapUpload } from "../upsertSourceMapUpload.js";

describe("getSourceMapUploadsPendingUnzipPage", () => {
  const prefix = `pending_unzip_${Date.now()}_`;

  beforeAll(async () => {
    const { promise } = getMongoConnection();
    await promise;
  });

  afterEach(async () => {
    await getSourceMapUploadModel().deleteMany({
      projectId: new RegExp(`^${prefix}`),
    });
  });

  it("returns only zip uploads with localZipIngested not true; marks ingested", async () => {
    const p = `${prefix}a`;
    await upsertSourceMapUpload({
      projectId: p,
      repoIdentifier: "r1",
      version: "v1",
      fimidaraPath: "x",
      isZip: true,
      uploadedAt: new Date(),
      createdBy: "t",
    });
    await upsertSourceMapUpload({
      projectId: p,
      repoIdentifier: "r2",
      version: "v2",
      fimidaraPath: "x",
      isZip: true,
      uploadedAt: new Date(),
      createdBy: "t",
    });
    await upsertSourceMapUpload({
      projectId: p,
      repoIdentifier: "r3",
      version: "v3",
      fimidaraPath: "x",
      isZip: false,
      uploadedAt: new Date(),
      createdBy: "t",
    });

    const first = await getSourceMapUploadsPendingUnzipPage({
      page: 1,
      pageSize: 500,
    });
    const oursFirst = first.items.filter((u) => u.projectId === p);
    const zipRepos = oursFirst.map((u) => u.repoIdentifier).sort();
    expect(zipRepos).toEqual(["r1", "r2"]);

    await markSourceMapUploadLocalZipIngested(p, "r1", "v1");

    const second = await getSourceMapUploadsPendingUnzipPage({
      page: 1,
      pageSize: 500,
    });
    const oursSecond = second.items.filter((u) => u.projectId === p);
    expect(oursSecond.map((u) => u.repoIdentifier)).toEqual(["r2"]);
  });
});

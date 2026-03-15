import { getLocalSourceMapCacheModel } from "../../db/sourceMap.mongo.js";
import { getSourceMapUploadModel } from "../../db/sourceMap.mongo.js";
import type { ISourceMapUpload } from "../../definitions/sourceMap.js";

export async function getSourceMapUploadsByProject(
  projectId: string
): Promise<ISourceMapUpload[]> {
  const model = getSourceMapUploadModel();
  const docs = await model
    .find({ projectId })
    .sort({ uploadedAt: -1 })
    .lean()
    .exec();
  return docs as ISourceMapUpload[];
}

/** Get zip uploads that do not yet have a local cache entry (unzipped locally). */
export async function getSourceMapUploadsPendingUnzip(): Promise<
  ISourceMapUpload[]
> {
  const uploadModel = getSourceMapUploadModel();
  const cacheModel = getLocalSourceMapCacheModel();
  const uploads = (await uploadModel
    .find({ isZip: true })
    .lean()
    .exec()) as ISourceMapUpload[];
  if (uploads.length === 0) return [];
  const cached = await cacheModel
    .find({})
    .select({ projectId: 1, repoIdentifier: 1, version: 1 })
    .lean()
    .exec();
  const cacheSet = new Set(
    (cached as { projectId: string; repoIdentifier: string; version: string }[]).map(
      (c) => `${c.projectId}\0${c.repoIdentifier}\0${c.version}`
    )
  );
  return uploads.filter(
    (u) => !cacheSet.has(`${u.projectId}\0${u.repoIdentifier}\0${u.version}`)
  );
}

export async function getSourceMapUpload(
  projectId: string,
  repoIdentifier: string,
  version: string
): Promise<ISourceMapUpload | null> {
  const model = getSourceMapUploadModel();
  const doc = await model
    .findOne({ projectId, repoIdentifier, version })
    .lean()
    .exec();
  return doc ? (doc as ISourceMapUpload) : null;
}

/** Get the set of (repoIdentifier, version) that have source maps for a
 * project. */
export async function getHasSourceMapSet(
  projectId: string
): Promise<Set<string>> {
  const uploads = await getSourceMapUploadsByProject(projectId);
  const set = new Set<string>();
  for (const u of uploads) {
    set.add(`${u.repoIdentifier}\0${u.version}`);
  }
  return set;
}


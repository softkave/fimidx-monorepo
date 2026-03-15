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

/** Get uploads that are zip and not yet unzipped. */
export async function getSourceMapUploadsPendingUnzip(): Promise<
  ISourceMapUpload[]
> {
  const model = getSourceMapUploadModel();
  const docs = await model
    .find({ isZip: true, unzippedFimidaraPath: { $in: [null, ""] } })
    .lean()
    .exec();
  return docs as ISourceMapUpload[];
}

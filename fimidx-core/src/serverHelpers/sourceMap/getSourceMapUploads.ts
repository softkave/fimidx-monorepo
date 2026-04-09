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

export type GetSourceMapUploadsPendingUnzipPageParams = {
  page: number;
  pageSize: number;
};

export type GetSourceMapUploadsPendingUnzipPageResult = {
  items: ISourceMapUpload[];
  hasMore: boolean;
};

/**
 * Zip uploads not yet marked as locally ingested (see `localZipIngested`).
 * Paginated; use page=1 repeatedly after processing — completed rows drop out.
 */
export async function getSourceMapUploadsPendingUnzipPage(
  params: GetSourceMapUploadsPendingUnzipPageParams
): Promise<GetSourceMapUploadsPendingUnzipPageResult> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.max(1, Math.floor(params.pageSize));
  const skip = (page - 1) * pageSize;
  const uploadModel = getSourceMapUploadModel();
  const raw = (await uploadModel
    .find({ isZip: true, localZipIngested: { $ne: true } })
    .sort({ uploadedAt: 1 })
    .skip(skip)
    .limit(pageSize + 1)
    .lean()
    .exec()) as ISourceMapUpload[];
  const hasMore = raw.length > pageSize;
  return { items: raw.slice(0, pageSize), hasMore };
}

export async function markSourceMapUploadLocalZipIngested(
  projectId: string,
  repoIdentifier: string,
  version: string
): Promise<void> {
  await getSourceMapUploadModel().updateOne(
    { projectId, repoIdentifier, version },
    { $set: { localZipIngested: true } }
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


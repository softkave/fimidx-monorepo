import { getSourceMapUploadModel } from "../../db/sourceMap.mongo.js";
import type { ISourceMapUpload } from "../../definitions/sourceMap.js";

export async function createSourceMapUpload(
  params: ISourceMapUpload
): Promise<ISourceMapUpload> {
  const model = getSourceMapUploadModel();
  const doc = await model.create({
    ...params,
    localZipIngested: false,
  });
  return doc.toObject() as ISourceMapUpload;
}

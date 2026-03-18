import path from "path";
import {
  getSourceMapMetadataModel,
  getSourceMapSegmentsModel,
} from "../../db/sourceMap.mongo.js";
import type { ISourceMapSegmentItem } from "../../definitions/sourceMap.js";

export interface IOriginalPositionResult {
  source: string | null;
  line: number | null;
  column: number | null;
  name: string | null;
}

const metadataCacheKey = (
  projectId: string,
  repoIdentifier: string,
  version: string,
  generatedFile: string
): string => `${projectId}\0${repoIdentifier}\0${version}\0${generatedFile}`;

/**
 * Derive path from stack URL for lookup. Handles http(s) and webpack-style
 * URLs. Returns path with forward slashes, no leading slash, no query.
 */
export function generatedFileFromUrl(url: string): string {
  const withoutQuery = url.split("?")[0].trim();
  if (withoutQuery.startsWith("webpack:///")) {
    const rest = withoutQuery.slice("webpack:///".length);
    return rest.replace(/^\.\//, "").replace(/\\/g, "/");
  }
  if (withoutQuery.startsWith("file://")) {
    const rest = withoutQuery.slice(7).replace(/\\/g, "/");
    return rest.replace(/^\/+/, "");
  }
  try {
    const u = new URL(
      withoutQuery.startsWith("/") ? `http://x${withoutQuery}` : withoutQuery
    );
    const pathname = u.pathname.replace(/^\/+/, "").replace(/\\/g, "/");
    return pathname || path.basename(withoutQuery);
  } catch {
    const basename = path.basename(withoutQuery);
    return basename.replace(/\\/g, "/");
  }
}

/**
 * Resolve generatedFile from URL: try full path first, then basename.
 */
async function resolveGeneratedFile(
  projectId: string,
  repoIdentifier: string,
  version: string,
  url: string
): Promise<string | null> {
  const pathFromUrl = generatedFileFromUrl(url);
  if (!pathFromUrl) return null;
  const metadataModel = getSourceMapMetadataModel();
  const byPath = await metadataModel
    .findOne({
      projectId,
      repoIdentifier,
      version,
      generatedFile: pathFromUrl,
    })
    .lean()
    .exec();
  if (byPath) return pathFromUrl;

  const urlParts = pathFromUrl.split("/").filter(Boolean);
  const urlBasename = urlParts.length > 0 ? urlParts[urlParts.length - 1] : "";
  if (!urlBasename) return null;
  const urlFolders = urlParts.length > 1 ? urlParts.slice(0, -1) : [];

  const candidates = await metadataModel
    .find({
      projectId,
      repoIdentifier,
      version,
      generatedFileBasename: urlBasename,
    })
    .select({
      generatedFile: 1,
      generatedFileFolders: 1,
      generatedFileBasename: 1,
    })
    .lean()
    .exec();

  // TODO: record candidates.length and ambiguity rate to evaluate adding a
  // `lastFolder` limiter.
  if (candidates.length === 0) return null;

  let best:
    | {
        generatedFile: string;
        generatedFileFolders: string[];
        score: number;
        remainingCandidateSegments: number;
        totalCandidateSegments: number;
      }
    | undefined;
  let bestIsAmbiguous = false;

  for (const c of candidates) {
    const candidateFolders = Array.isArray(c.generatedFileFolders)
      ? c.generatedFileFolders
      : [];

    let score = 0;
    let ui = urlFolders.length - 1;
    let ci = candidateFolders.length - 1;
    while (ui >= 0 && ci >= 0 && urlFolders[ui] === candidateFolders[ci]) {
      score++;
      ui--;
      ci--;
    }

    const remainingCandidateSegments = ci + 1; // segments not matched in candidate prefix
    const totalCandidateSegments = candidateFolders.length;

    const next = {
      generatedFile: c.generatedFile as string,
      generatedFileFolders: candidateFolders,
      score,
      remainingCandidateSegments,
      totalCandidateSegments,
    };

    if (!best) {
      best = next;
      bestIsAmbiguous = false;
      continue;
    }

    const better =
      next.score > best.score ||
      (next.score === best.score &&
        next.remainingCandidateSegments < best.remainingCandidateSegments) ||
      (next.score === best.score &&
        next.remainingCandidateSegments === best.remainingCandidateSegments &&
        next.totalCandidateSegments > best.totalCandidateSegments) ||
      (next.score === best.score &&
        next.remainingCandidateSegments === best.remainingCandidateSegments &&
        next.totalCandidateSegments === best.totalCandidateSegments &&
        next.generatedFile.localeCompare(best.generatedFile) < 0);

    const tied =
      next.score === best.score &&
      next.remainingCandidateSegments === best.remainingCandidateSegments &&
      next.totalCandidateSegments === best.totalCandidateSegments &&
      next.generatedFile !== best.generatedFile;

    if (better) {
      best = next;
      bestIsAmbiguous = false;
    } else if (tied) {
      bestIsAmbiguous = true;
    }
  }

  // TODO: if bestIsAmbiguous is true, record an ambiguity counter.
  return best?.generatedFile ?? null;
}

/**
 * Binary search: largest segment with generatedColumn <= column.
 */
function findSegment(
  segments: ISourceMapSegmentItem[],
  column: number
): ISourceMapSegmentItem | null {
  let lo = 0;
  let hi = segments.length - 1;
  let best: ISourceMapSegmentItem | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (seg.generatedColumn <= column) {
      best = seg;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export type MetadataCache = Map<string, { sources: string[]; names: string[] }>;

/**
 * Look up original position from MongoDB segments. Resolves generatedFile from
 * url (path then basename). Uses optional metadataCache to avoid repeated
 * fetches.
 */
export async function originalPositionFromMongo(
  params: {
    projectId: string;
    repoIdentifier: string;
    version: string;
    url: string;
    line: number;
    column: number;
  },
  metadataCache?: MetadataCache
): Promise<IOriginalPositionResult | null> {
  const { projectId, repoIdentifier, version, url, line, column } = params;
  const generatedFile = await resolveGeneratedFile(
    projectId,
    repoIdentifier,
    version,
    url
  );
  if (!generatedFile) return null;

  const key = metadataCacheKey(
    projectId,
    repoIdentifier,
    version,
    generatedFile
  );
  let meta = metadataCache?.get(key);
  if (!meta) {
    const metadataModel = getSourceMapMetadataModel();
    const doc = await metadataModel
      .findOne({ projectId, repoIdentifier, version, generatedFile })
      .lean()
      .exec();
    if (!doc) return null;
    meta = { sources: doc.sources ?? [], names: doc.names ?? [] };
    metadataCache?.set(key, meta);
  }

  const segmentsModel = getSourceMapSegmentsModel();
  const segmentDoc = await segmentsModel
    .findOne({
      projectId,
      repoIdentifier,
      version,
      generatedFile,
      generatedLine: line,
    })
    .lean()
    .exec();
  if (!segmentDoc?.segments?.length) return null;

  const segment = findSegment(
    segmentDoc.segments as ISourceMapSegmentItem[],
    column
  );
  if (!segment) return null;

  const source =
    segment.sourceIndex >= 0 && segment.sourceIndex < meta.sources.length
      ? meta.sources[segment.sourceIndex]
      : null;
  const name =
    segment.nameIndex >= 0 && segment.nameIndex < meta.names.length
      ? meta.names[segment.nameIndex]
      : null;

  return {
    source,
    line: segment.originalLine,
    column: segment.originalColumn,
    name,
  };
}

/**
 * Build a lookupPosition function for symbolicateStack that uses MongoDB.
 */
export function buildLookupPositionFromMongo(
  projectId: string,
  repoIdentifier: string,
  version: string,
  metadataCache?: MetadataCache
): (
  url: string,
  line: number,
  column: number
) => Promise<IOriginalPositionResult | null> {
  return async (url: string, line: number, column: number) =>
    originalPositionFromMongo(
      { projectId, repoIdentifier, version, url, line, column },
      metadataCache
    );
}

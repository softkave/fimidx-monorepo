import { get, set } from "lodash-es";
import type { Model } from "mongoose";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { getObjModel } from "../../db/fimidx.mongo.js";
import { getSymbolicatedLogTrackingModel } from "../../db/sourceMap.mongo.js";
import type { IObj } from "../../definitions/obj.js";
import { kObjTags } from "../../definitions/obj.js";
import { normalizePathSegment } from "../../definitions/sourceMap.js";
import { getDefaultStorageType } from "../../storage/config.js";
import type { IObjStorage } from "../../storage/types.js";
import {
  ensureLocalSourceMap,
  getAllSymbolicationConfigs,
  getHasSourceMapSet,
  getSymbolicationState,
  upsertSymbolicationState,
} from "../sourceMap/index.js";
import { getFirstValueFromFields } from "./getFirstValueFromFields.js";
import {
  buildLookupPositionFromMongo,
  type MetadataCache,
} from "./symbolicateFromMongo.js";
import { symbolicateStack } from "./symbolicateStack.js";

/**
 * Read repo/version from a log using configured fields, then normalize so they
 * match stored upload keys (paths stay path-safe; logs may still send originals
 * like "org/repo").
 */
function getNormalizedRepoAndVersion(
  record: Record<string, unknown>,
  repoIdFields: string[],
  versionFields: string[]
): { repo: string; version: string } | null {
  const rawRepo = getFirstValueFromFields(record, repoIdFields);
  const rawVersion = getFirstValueFromFields(record, versionFields);
  if (rawRepo == null || rawVersion == null) return null;
  const repo = normalizePathSegment(rawRepo);
  const version = normalizePathSegment(rawVersion);
  if (!repo || !version) return null;
  return { repo, version };
}

const kSymbolicationBy = "symbolication";
const kSymbolicationByType = "system";

const defaultBatchSize = 1000;
const defaultMaxAgeMs = 10 * 60 * 1000; // 10 minutes
const defaultConcurrency = 50;

export interface IReadLogsBatchResult {
  objs: IObj[];
  hasMore: boolean;
}

/**
 * Read a batch of log objs for symbolication using Mongoose directly.
 */
export async function readLogsBatchMongo(params: {
  projectId: string;
  fromMs: number;
  toMs: number;
  page: number;
  limit: number;
}): Promise<IReadLogsBatchResult> {
  const { projectId, fromMs, toMs, page, limit } = params;
  const model = getObjModel();
  const filter = {
    projectId,
    tag: kObjTags.log,
    deletedAt: null,
    createdAt: {
      $gte: new Date(fromMs),
      $lte: new Date(toMs),
    },
  };
  const objs = await model
    .find(filter)
    .sort({ createdAt: 1 })
    .skip(page * limit)
    .limit(limit)
    .lean()
    .exec();
  return {
    objs: objs as IObj[],
    hasMore: objs.length === limit,
  };
}

/**
 * Read a batch of log objs for symbolication. Postgres not implemented.
 */
export async function readLogsBatchPostgres(_params: {
  projectId: string;
  fromMs: number;
  toMs: number;
  page: number;
  limit: number;
}): Promise<IReadLogsBatchResult> {
  throw new Error("readLogsBatch for Postgres is not implemented yet");
}

export interface ISymbolicationUpdate {
  logId: string;
  updatePatch: Record<string, unknown>;
}

export interface ISymbolicationTrackingEntry {
  logId: string;
  fieldPath: string;
  fieldValue: string;
  symbolicatedAt: Date;
}

/**
 * Apply symbolication updates and tracking entries in Mongo using bulkWrite and
 * bulk insert.
 */
export async function applySymbolicationUpdatesMongo(params: {
  updates: ISymbolicationUpdate[];
  trackingEntries: ISymbolicationTrackingEntry[];
}): Promise<void> {
  const { updates, trackingEntries } = params;
  const objModel = getObjModel() as Model<IObj>;
  const trackingModel = getSymbolicatedLogTrackingModel();

  const bulkWriteOps: Parameters<typeof objModel.bulkWrite>[0] = updates.map(
    (u) => {
      const setPayload: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: kSymbolicationBy,
        updatedByType: kSymbolicationByType,
      };
      for (const [key, value] of Object.entries(u.updatePatch)) {
        setPayload[`objRecord.${key}`] = value;
      }
      return {
        updateOne: {
          filter: { id: u.logId, tag: kObjTags.log },
          update: { $set: setPayload },
        },
      };
    }
  );

  if (bulkWriteOps.length > 0) {
    await objModel.bulkWrite(bulkWriteOps);
  }

  if (trackingEntries.length > 0) {
    await trackingModel.insertMany(trackingEntries);
  }
}

/**
 * Apply symbolication updates and tracking entries. Postgres not implemented.
 */
export async function applySymbolicationUpdatesPostgres(_params: {
  updates: ISymbolicationUpdate[];
  trackingEntries: ISymbolicationTrackingEntry[];
}): Promise<void> {
  throw new Error(
    "applySymbolicationUpdates for Postgres is not implemented yet"
  );
}

export async function runSymbolication(params?: {
  storage?: IObjStorage;
  storageType?: "mongo" | "postgres";
}): Promise<void> {
  const storageType = params?.storageType ?? getDefaultStorageType();
  const symbolicationConfig = getCoreConfig().symbolication;
  const batchSize = symbolicationConfig?.batchSize ?? defaultBatchSize;
  const maxAgeMs = symbolicationConfig?.maxAgeMs ?? defaultMaxAgeMs;
  const nowMs = Date.now();
  const cutoffMs = nowMs - maxAgeMs;

  const configList = await getAllSymbolicationConfigs();

  for (const config of configList) {
    if (
      !config.fieldsToSymbolicate?.length ||
      !config.repoIdFields?.length ||
      !config.versionFields?.length
    ) {
      continue;
    }

    const state = await getSymbolicationState(config.projectId);
    const lastMs = state?.lastProcessedTimestampMs ?? 0;
    const fromMs = Math.max(lastMs, 0);
    const toMs = Math.min(cutoffMs, nowMs);

    if (fromMs >= toMs) continue;

    const hasSourceMapSet = await getHasSourceMapSet(config.projectId);
    if (hasSourceMapSet.size === 0) continue;

    const cycleCount = (state?.cycleCount ?? 0) + 1;
    let maxProcessedMs = fromMs;

    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const readResult =
        storageType === "mongo"
          ? await readLogsBatchMongo({
              projectId: config.projectId,
              fromMs,
              toMs,
              page,
              limit: batchSize,
            })
          : await readLogsBatchPostgres({
              projectId: config.projectId,
              fromMs,
              toMs,
              page,
              limit: batchSize,
            });

      const logs = readResult.objs;
      if (logs.length === 0) {
        hasMore = false;
        break;
      }

      const localMapByKey = new Map<string, string>();
      for (const log of logs) {
        const normalized = getNormalizedRepoAndVersion(
          (log.objRecord ?? {}) as Record<string, unknown>,
          config.repoIdFields,
          config.versionFields
        );
        if (!normalized) continue;
        const { repo, version } = normalized;
        const key = `${repo}\0${version}`;
        if (!hasSourceMapSet.has(key)) continue;
        if (localMapByKey.has(key)) continue;
        const localPath = await ensureLocalSourceMap(
          config.projectId,
          repo,
          version,
          cycleCount
        );
        if (localPath) localMapByKey.set(key, localPath);
      }

      const updates: ISymbolicationUpdate[] = [];
      const trackingEntries: ISymbolicationTrackingEntry[] = [];
      const symbolicatedAt = new Date();
      const concurrency =
        symbolicationConfig?.concurrency ?? defaultConcurrency;
      const metadataCache: MetadataCache = new Map();

      async function processOneLog(log: IObj): Promise<{
        update?: ISymbolicationUpdate;
        trackingEntry?: ISymbolicationTrackingEntry;
        maxProcessedMs?: number;
      } | null> {
        const record = (log.objRecord ?? {}) as Record<string, unknown>;
        const normalized = getNormalizedRepoAndVersion(
          record,
          config.repoIdFields,
          config.versionFields
        );
        if (!normalized) return null;
        const { repo, version } = normalized;
        const key = `${repo}\0${version}`;
        if (!hasSourceMapSet.has(key)) return null;
        if (!localMapByKey.has(key)) return null;

        const fieldPath = config.fieldsToSymbolicate.find(
          (f) => get(record, f) != null && typeof get(record, f) === "string"
        );
        if (!fieldPath) return null;

        const stackValue = get(record, fieldPath);
        if (typeof stackValue !== "string") return null;

        try {
          const lookupPosition = buildLookupPositionFromMongo(
            config.projectId,
            repo,
            version,
            metadataCache
          );
          const symbolicated = await symbolicateStack(
            stackValue,
            lookupPosition
          );
          if (symbolicated === stackValue) return null;

          const createdAtMs =
            log.createdAt instanceof Date
              ? log.createdAt.getTime()
              : Number(log.createdAt);
          const updatePatch: Record<string, unknown> = {};
          set(updatePatch, fieldPath, symbolicated);
          return {
            update: { logId: log.id, updatePatch },
            trackingEntry: {
              logId: log.id,
              fieldPath,
              fieldValue: stackValue,
              symbolicatedAt,
            },
            maxProcessedMs: createdAtMs,
          };
        } catch {
          return null;
        }
      }

      for (let i = 0; i < logs.length; i += concurrency) {
        const chunk = logs.slice(i, i + concurrency);
        const results = await Promise.all(chunk.map(processOneLog));
        for (const r of results) {
          if (!r) continue;
          if (r.update) updates.push(r.update);
          if (r.trackingEntry) trackingEntries.push(r.trackingEntry);
          if (r.maxProcessedMs != null && r.maxProcessedMs > maxProcessedMs) {
            maxProcessedMs = r.maxProcessedMs;
          }
        }
      }

      if (updates.length > 0) {
        if (storageType === "mongo") {
          await applySymbolicationUpdatesMongo({ updates, trackingEntries });
        } else {
          await applySymbolicationUpdatesPostgres({
            updates,
            trackingEntries,
          });
        }
      }

      hasMore = readResult.hasMore;
      page++;
    }

    await upsertSymbolicationState({
      projectId: config.projectId,
      lastProcessedTimestampMs: maxProcessedMs,
      lastCycleAt: new Date(),
      cycleCount,
    });
  }
}

import { getMsFromDuration } from "../../common/date.js";
import { extractMonitorFilters } from "../../common/monitor.js";
import type { IMonitor, MonitorTimeField } from "../../definitions/monitor.js";
import {
  kMonitorResourceTypes,
  kMonitorTimeFields,
} from "../../definitions/monitor.js";
import {
  kObjTags,
  type IObjQuery,
  type IObjRecordQueryList,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { countObjs } from "../obj/countObjs.js";
import { getManyObjs } from "../obj/getObjs.js";
import { objToLog } from "../logs/objToLog.js";

export { extractMonitorFilters };

/** Cap evaluation windows after outages to avoid scanning unbounded history. */
export const kMonitorMaxWindowMultiplier = 2;

export function computeMonitorWindow(params: {
  monitor: IMonitor;
  now?: Date;
}): { windowStart: Date; windowEnd: Date } {
  const now = params.now ?? new Date();
  const intervalMs = getMsFromDuration(params.monitor.interval);
  const maxWindowMs = intervalMs * kMonitorMaxWindowMultiplier;

  let windowStart: Date;
  if (params.monitor.lastRunAt) {
    windowStart = new Date(params.monitor.lastRunAt);
    const age = now.getTime() - windowStart.getTime();
    if (age > maxWindowMs) {
      windowStart = new Date(now.getTime() - maxWindowMs);
    }
  } else {
    windowStart = new Date(now.getTime() - intervalMs);
  }

  return { windowStart, windowEnd: now };
}

export function buildMonitorLogQuery(params: {
  projectId: string;
  filters: IObjRecordQueryList;
  timeField: MonitorTimeField;
  windowStart: Date;
  windowEnd: Date;
}): IObjQuery {
  const { projectId, filters, timeField, windowStart, windowEnd } = params;

  if (timeField === kMonitorTimeFields.createdAt) {
    return {
      recordQuery: filters.length > 0 ? filters : undefined,
      metaQuery: {
        projectId: { eq: projectId },
        createdAt: {
          gte: windowStart.toISOString(),
          lte: windowEnd.toISOString(),
        },
      },
    };
  }

  // timestamp lives on the log record
  return {
    recordQuery: [
      ...filters,
      {
        op: "gte",
        field: "timestamp",
        value: windowStart.toISOString(),
      },
      {
        op: "lte",
        field: "timestamp",
        value: windowEnd.toISOString(),
      },
    ],
    metaQuery: {
      projectId: { eq: projectId },
    },
  };
}

export function shouldAlertForMatchCount(params: {
  matchCount: number;
  alertIfCountGreaterThan?: number | null;
}): boolean {
  const { matchCount, alertIfCountGreaterThan } = params;
  if (matchCount <= 0) return false;
  if (alertIfCountGreaterThan == null) return true;
  return matchCount > alertIfCountGreaterThan;
}

export async function countMonitorMatches(params: {
  monitor: Pick<
    IMonitor,
    "projectId" | "query" | "timeField" | "resourceType"
  >;
  windowStart: Date;
  windowEnd: Date;
  storage?: IObjStorage;
}): Promise<number> {
  const { monitor, windowStart, windowEnd, storage } = params;

  if (monitor.resourceType !== kMonitorResourceTypes.logs) {
    return 0;
  }

  const filters = extractMonitorFilters(monitor.query);
  const objQuery = buildMonitorLogQuery({
    projectId: monitor.projectId,
    filters,
    timeField: monitor.timeField,
    windowStart,
    windowEnd,
  });

  const { count } = await countObjs({
    objQuery,
    tag: kObjTags.log,
    storage,
  });

  return count;
}

export async function previewMonitorMatches(params: {
  monitor: IMonitor;
  storage?: IObjStorage;
  page?: number;
  limit?: number;
}) {
  const { monitor, storage } = params;
  const pageNumber = params.page ?? 1;
  const limitNumber = params.limit ?? 50;
  const { windowStart, windowEnd } = computeMonitorWindow({ monitor });

  const filters = extractMonitorFilters(monitor.query);
  const objQuery = buildMonitorLogQuery({
    projectId: monitor.projectId,
    filters,
    timeField: monitor.timeField,
    windowStart,
    windowEnd,
  });

  const [{ count }, result] = await Promise.all([
    countObjs({ objQuery, tag: kObjTags.log, storage }),
    getManyObjs({
      objQuery,
      tag: kObjTags.log,
      page: pageNumber - 1,
      limit: limitNumber,
      storage,
    }),
  ]);

  return {
    matchCount: count,
    windowStart,
    windowEnd,
    timeField: monitor.timeField,
    logs: result.objs.map(objToLog),
    page: pageNumber,
    limit: limitNumber,
    hasMore: result.hasMore,
  };
}

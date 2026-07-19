import { getMsFromDuration } from "../../common/date.js";
import type {
  IMonitor,
  IMonitorObjQuery,
  MonitorTimeField,
} from "../../definitions/monitor.js";
import {
  kMonitorResourceTypes,
  kMonitorTimeFields,
} from "../../definitions/monitor.js";
import {
  kObjTags,
  type IObjQuery,
  type IObjQueryBranch,
  type IObjQueryLeaf,
} from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { objToLog } from "../logs/objToLog.js";
import { countObjs } from "../obj/countObjs.js";
import { getManyObjs } from "../obj/getObjs.js";

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

function buildWindowLeaf(params: {
  projectId: string;
  timeField: MonitorTimeField;
  windowStart: Date;
  windowEnd: Date;
}): IObjQueryLeaf {
  const { projectId, timeField, windowStart, windowEnd } = params;

  if (timeField === kMonitorTimeFields.createdAt) {
    return {
      metaQuery: {
        projectId: { eq: projectId },
        createdAt: {
          gte: windowStart.toISOString(),
          lte: windowEnd.toISOString(),
        },
      },
    };
  }

  return {
    recordQuery: [
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

/**
 * Build a log query that preserves the monitor/alert query tree (including
 * and/or) and ANDs it with the evaluation window + projectId constraints.
 */
export function buildMonitorLogQuery(params: {
  projectId: string;
  query?: IMonitorObjQuery | null;
  timeField: MonitorTimeField;
  windowStart: Date;
  windowEnd: Date;
}): IObjQuery {
  const windowLeaf = buildWindowLeaf(params);
  const monitorQuery = params.query as IObjQueryBranch | null | undefined;

  if (!monitorQuery) {
    return windowLeaf;
  }

  // Window leaf first so getProjectIdFromObjQuery finds projectId on the
  // combined tree (it walks the first and/or branch).
  return {
    and: [windowLeaf, monitorQuery],
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
  monitor: Pick<IMonitor, "projectId" | "query" | "timeField" | "resourceType">;
  windowStart: Date;
  windowEnd: Date;
  storage?: IObjStorage;
}): Promise<number> {
  const { monitor, windowStart, windowEnd, storage } = params;

  if (monitor.resourceType !== kMonitorResourceTypes.logs) {
    return 0;
  }

  const objQuery = buildMonitorLogQuery({
    projectId: monitor.projectId,
    query: monitor.query,
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

  const objQuery = buildMonitorLogQuery({
    projectId: monitor.projectId,
    query: monitor.query,
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

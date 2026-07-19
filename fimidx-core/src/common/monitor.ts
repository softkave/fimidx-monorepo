import type { IMonitorObjQuery } from "../definitions/monitor.js";
import {
  isObjQueryLeaf,
  type IObjRecordQueryList,
} from "../definitions/obj.js";

/**
 * Pull the flat log-field filter list out of a monitor query tree.
 * Handles a leaf or a single and/or wrapper around a leaf (the UI shape).
 */
export function extractMonitorFilters(
  query: IMonitorObjQuery | undefined
): IObjRecordQueryList {
  if (!query) return [];
  if (isObjQueryLeaf(query as never)) {
    return (query as { recordQuery?: IObjRecordQueryList }).recordQuery ?? [];
  }
  const logical = query as {
    and?: IMonitorObjQuery[];
    or?: IMonitorObjQuery[];
  };
  const branch = logical.and?.[0] ?? logical.or?.[0];
  if (branch && isObjQueryLeaf(branch as never)) {
    return (branch as { recordQuery?: IObjRecordQueryList }).recordQuery ?? [];
  }
  return [];
}

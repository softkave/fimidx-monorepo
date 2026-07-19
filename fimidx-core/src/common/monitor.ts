import type { IMonitorObjQuery } from "../definitions/monitor.js";
import {
  isObjQueryLeaf,
  type IObjRecordQueryList,
} from "../definitions/obj.js";

/**
 * Pull a flat recordQuery list for UI editors that only support leaf filters.
 * Does not preserve or/and semantics — do not use for evaluation or alert
 * snapshots. Prefer the full query tree for count/query paths.
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
  // Form editor: only unwrap a single and/or wrapper around one leaf.
  const branch = logical.and?.[0] ?? logical.or?.[0];
  if (branch && isObjQueryLeaf(branch as never)) {
    return (branch as { recordQuery?: IObjRecordQueryList }).recordQuery ?? [];
  }
  return [];
}

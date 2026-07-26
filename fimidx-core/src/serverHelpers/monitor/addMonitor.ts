import assert from "assert";
import { getMsFromDuration } from "../../common/date.js";
import { kOwnServerErrorCodes, OwnServerError } from "../../common/error.js";
import type {
  AddMonitorEndpointArgs,
  IMonitorObjRecord,
} from "../../definitions/monitor.js";
import {
  kMonitorMinIntervalMs,
  kMonitorResourceTypes,
  kMonitorTimeFields,
  normalizeMonitorReportsTo,
} from "../../definitions/monitor.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { setManyObjs } from "../obj/setObjs.js";
import { validateMonitorReportsTo } from "./validateMonitorReportsTo.js";
import { objToMonitor } from "./objToMonitor.js";

export async function addMonitor(params: {
  args: AddMonitorEndpointArgs;
  by: string;
  byType: string;
  groupId: string;
  storage?: IObjStorage;
  /** Skip reportsTo validation (e.g. unit tests with fake userIds). */
  skipReportsToValidation?: boolean;
}) {
  const {
    args,
    by,
    byType,
    groupId,
    storage,
    skipReportsToValidation,
  } = params;
  const {
    name,
    status,
    interval,
    reportsTo: reportsToInput,
    projectId,
    query,
    description,
    resourceType = kMonitorResourceTypes.logs,
    timeField = kMonitorTimeFields.createdAt,
    alertIfCountGreaterThan = null,
    muted = false,
    snoozedUntil = null,
  } = args;

  const intervalMs = getMsFromDuration(interval);
  assert.ok(
    intervalMs >= kMonitorMinIntervalMs,
    new OwnServerError(
      `Monitor interval must be at least ${kMonitorMinIntervalMs / 60000} minutes`,
      kOwnServerErrorCodes.BadRequest
    )
  );

  const cooldown = args.cooldown ?? interval;
  const reportsTo = normalizeMonitorReportsTo(reportsToInput);

  if (!skipReportsToValidation) {
    await validateMonitorReportsTo({
      groupId,
      reportsTo,
      storage,
    });
  }

  const objRecord: IMonitorObjRecord = {
    name,
    status,
    interval,
    reportsTo,
    query,
    description,
    resourceType,
    timeField,
    alertIfCountGreaterThan,
    cooldown,
    muted,
    snoozedUntil,
    lastRunAt: null,
    lastAlertedAt: null,
    runningAt: null,
  };

  const { failedItems, newObjs } = await setManyObjs({
    by,
    byType,
    groupId,
    tag: kObjTags.monitor,
    input: {
      projectId,
      items: [objRecord],
      conflictOnKeys: ["name"],
      onConflict: "fail",
    },
    storage,
  });

  assert.ok(
    failedItems.length === 0,
    new OwnServerError(
      "Failed to add monitor",
      kOwnServerErrorCodes.InternalServerError
    )
  );
  assert.ok(
    newObjs.length === 1,
    new OwnServerError(
      "Failed to add monitor",
      kOwnServerErrorCodes.InternalServerError
    )
  );

  const monitor = objToMonitor(newObjs[0]);
  return { monitor };
}

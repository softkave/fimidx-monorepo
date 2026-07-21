"use client";

import { getMsFromDuration } from "fimidx-core/common/date";
import { extractMonitorFilters } from "fimidx-core/common/monitor";
import { kAlertTimeFieldLabels } from "fimidx-core/definitions/alert";
import {
  IMonitor,
  kMonitorStatus,
  kMonitorStatusLabels,
} from "fimidx-core/definitions/monitor";
import { format } from "date-fns";
import { Badge } from "../ui/badge";

function durationMinutes(
  duration: { minutes?: number } | undefined
): number | null {
  if (!duration) return null;
  try {
    return Math.round(getMsFromDuration(duration as never) / 60_000);
  } catch {
    return duration.minutes ?? null;
  }
}

function DetailRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{props.label}</dt>
      <dd className="text-sm break-words">{props.children}</dd>
    </div>
  );
}

export function MonitorDetailsSummary(props: { monitor: IMonitor }) {
  const { monitor } = props;
  const filters = extractMonitorFilters(monitor.query);
  const intervalMins = durationMinutes(monitor.interval);
  const cooldownMins = durationMinutes(monitor.cooldown);
  const now = Date.now();
  const isSnoozed =
    monitor.snoozedUntil != null &&
    new Date(monitor.snoozedUntil).getTime() > now;

  const reportsToUsers = monitor.reportsTo
    .filter((r) => r.type === "user")
    .map((r) => r.userId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={
            monitor.status === kMonitorStatus.enabled ? "default" : "secondary"
          }
        >
          {kMonitorStatusLabels[monitor.status]}
        </Badge>
        {monitor.muted ? <Badge variant="outline">Muted</Badge> : null}
        {isSnoozed && monitor.snoozedUntil ? (
          <Badge variant="outline">
            Snoozed until {format(new Date(monitor.snoozedUntil), "PPp")}
          </Badge>
        ) : null}
      </div>

      <dl className="flex flex-col gap-3">
        <DetailRow label="Description">
          {monitor.description?.trim() ? monitor.description : "—"}
        </DetailRow>
        <DetailRow label="Resource">Logs</DetailRow>
        <DetailRow label="Time field">
          {kAlertTimeFieldLabels[monitor.timeField]}
        </DetailRow>
        <DetailRow label="Interval">
          {intervalMins != null ? `${intervalMins} min` : "—"}
        </DetailRow>
        <DetailRow label="Cooldown">
          {cooldownMins != null ? `${cooldownMins} min` : "—"}
        </DetailRow>
        <DetailRow label="Threshold">
          {monitor.alertIfCountGreaterThan != null
            ? `Alert if count > ${monitor.alertIfCountGreaterThan}`
            : "Any match"}
        </DetailRow>
        <DetailRow label="Filters">
          {filters.length === 0 ? (
            "None"
          ) : (
            <ul className="list-disc list-inside space-y-0.5">
              {filters.map((f, i) => (
                <li key={i}>
                  <code className="text-xs">
                    {f.field} {f.op}{" "}
                    {typeof f.value === "string"
                      ? f.value
                      : JSON.stringify(f.value)}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </DetailRow>
        <DetailRow label="Notify">
          {reportsToUsers.length === 0
            ? "Nobody"
            : `${reportsToUsers.length} user${
                reportsToUsers.length === 1 ? "" : "s"
              }`}
        </DetailRow>
        <DetailRow label="Last run">
          {monitor.lastRunAt
            ? format(new Date(monitor.lastRunAt), "PPp")
            : "Never"}
        </DetailRow>
        <DetailRow label="Last alert">
          {monitor.lastAlertedAt
            ? format(new Date(monitor.lastAlertedAt), "PPp")
            : "Never"}
        </DetailRow>
        <DetailRow label="Created">
          {format(new Date(monitor.createdAt), "PPp")}
        </DetailRow>
        <DetailRow label="Updated">
          {format(new Date(monitor.updatedAt), "PPp")}
        </DetailRow>
      </dl>
    </div>
  );
}

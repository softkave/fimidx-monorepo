"use client";

import { useGetOrgMembers } from "@/src/lib/clientApi/org";
import { format } from "date-fns";
import { getMsFromDuration } from "fimidx-core/common/date";
import { extractMonitorFilters } from "fimidx-core/common/monitor";
import { kAlertTimeFieldLabels } from "fimidx-core/definitions/alert";
import {
  IMonitor,
  kMonitorStatus,
  kMonitorStatusLabels,
} from "fimidx-core/definitions/monitor";
import { useMemo } from "react";
import { LogsFilterChip } from "../log/filter/logs-filter-chip";
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

export function MonitorDetailsSummary(props: {
  monitor: IMonitor;
  orgId: string;
}) {
  const { monitor, orgId } = props;
  const filters = extractMonitorFilters(monitor.query);
  const intervalMins = durationMinutes(monitor.interval);
  const cooldownMins = durationMinutes(monitor.cooldown);
  const now = Date.now();
  const isSnoozed =
    monitor.snoozedUntil != null &&
    new Date(monitor.snoozedUntil).getTime() > now;

  const reportsToUserIds = useMemo(
    () =>
      monitor.reportsTo
        .filter((r) => r.type === "user")
        .map((r) => r.userId),
    [monitor.reportsTo]
  );

  const { data: membersData, isLoading: isLoadingMembers } = useGetOrgMembers({
    orgId,
  });

  const notifyUsers = useMemo(() => {
    const membersById = new Map(
      (membersData?.members ?? []).map((m) => [m.userId, m])
    );
    return reportsToUserIds.map((userId) => {
      const member = membersById.get(userId);
      const label = member?.name?.trim() || member?.email?.trim() || userId;
      return { userId, label };
    });
  }, [membersData?.members, reportsToUserIds]);

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3">
        <DetailRow label="Name">
          {monitor.name?.trim() ? monitor.name : "—"}
        </DetailRow>
        <DetailRow label="Description">
          {monitor.description?.trim() ? monitor.description : "—"}
        </DetailRow>
        <DetailRow label="Status">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={
                monitor.status === kMonitorStatus.enabled
                  ? "default"
                  : "secondary"
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
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f, i) => (
                <LogsFilterChip
                  key={`${f.field}-${f.op}-${i}`}
                  filter={{ item: f }}
                />
              ))}
            </div>
          )}
        </DetailRow>
        <DetailRow label="Notify">
          {reportsToUserIds.length === 0 ? (
            "Nobody"
          ) : isLoadingMembers ? (
            "Loading…"
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {notifyUsers.map((user) => (
                <Badge key={user.userId} variant="secondary">
                  {user.label}
                </Badge>
              ))}
            </div>
          )}
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

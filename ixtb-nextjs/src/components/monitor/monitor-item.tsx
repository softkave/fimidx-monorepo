"use client";

import { getMsFromDuration } from "fimidx-core/common/date";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import {
  IMonitor,
  kMonitorStatus,
  kMonitorStatusLabels,
} from "fimidx-core/definitions/monitor";
import { format } from "date-fns";
import Link from "next/link";
import { ComponentListItemSkeleton } from "../internal/component-list/component-list-item-skeleton.tsx";
import { ComponentListItem } from "../internal/component-list/component-list-item.tsx";
import { Badge } from "../ui/badge.tsx";
import { MonitorItemMenu } from "./monitor-item-menu.tsx";

export interface IMonitorItemProps {
  item: IMonitor;
  orgId: string;
}

function getCooldownUntil(monitor: IMonitor): Date | null {
  if (!monitor.lastAlertedAt) {
    return null;
  }
  const lastAlertedAt = new Date(monitor.lastAlertedAt);
  const cooldownMs = getMsFromDuration(monitor.cooldown);
  return new Date(lastAlertedAt.getTime() + cooldownMs);
}

export function MonitorItem(props: IMonitorItemProps) {
  const { item, orgId } = props;
  const projectId = item.projectId;
  const cooldownUntil = getCooldownUntil(item);
  const now = Date.now();
  const isSnoozed =
    item.snoozedUntil != null && new Date(item.snoozedUntil).getTime() > now;
  const isInCooldown =
    cooldownUntil != null && cooldownUntil.getTime() > now;

  return (
    <ComponentListItem
      button={
        <MonitorItemMenu
          monitor={item}
          orgId={orgId}
          projectId={projectId}
        />
      }
    >
      <Link
        href={kClientPaths.app.org.project.monitors.single(
          orgId,
          projectId,
          item.id
        )}
        className="flex-1"
      >
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{item.name}</h3>
          {item.description ? (
            <p className="text-muted-foreground text-sm">{item.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={
                item.status === kMonitorStatus.enabled ? "default" : "secondary"
              }
            >
              {kMonitorStatusLabels[item.status]}
            </Badge>
            {item.muted ? <Badge variant="outline">Muted</Badge> : null}
            {isSnoozed && item.snoozedUntil ? (
              <Badge variant="outline">
                Snoozed until {format(new Date(item.snoozedUntil), "PPp")}
              </Badge>
            ) : null}
            {isInCooldown && cooldownUntil ? (
              <Badge variant="outline">
                In cooldown until {format(cooldownUntil, "PPp")}
              </Badge>
            ) : null}
            {"callbackLastErrorAt" in item &&
            item.callbackLastErrorAt != null ? (
              <Badge variant="destructive">
                Last callback error{" "}
                {format(new Date(item.callbackLastErrorAt as string), "PPp")}
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>
    </ComponentListItem>
  );
}

export function MonitorItemSkeleton(props: { className?: string }) {
  return <ComponentListItemSkeleton className={props.className} />;
}

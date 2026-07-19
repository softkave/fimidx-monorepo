"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import {
  IAlert,
  kAlertResourceTypeLabels,
  kAlertTimeFieldLabels,
} from "fimidx-core/definitions/alert";
import { format } from "date-fns";
import Link from "next/link";
import { ComponentListItemSkeleton } from "../internal/component-list/component-list-item-skeleton.tsx";
import { ComponentListItem } from "../internal/component-list/component-list-item.tsx";
import { Badge } from "../ui/badge.tsx";

export interface IAlertItemProps {
  item: IAlert;
  orgId: string;
}

export function AlertItem(props: IAlertItemProps) {
  const { item, orgId } = props;
  const projectId = item.projectId;
  const acknowledged = !!item.acknowledgedAt;

  return (
    <ComponentListItem>
      <Link
        href={kClientPaths.app.org.project.alerts.single(
          orgId,
          projectId,
          item.id
        )}
        className="flex-1"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <h3 className="font-medium">{item.monitorName}</h3>
            <Badge variant={acknowledged ? "secondary" : "default"}>
              {acknowledged ? "Acknowledged" : "Open"}
            </Badge>
          </div>
          {item.monitorDescription ? (
            <p className="text-muted-foreground text-sm">
              {item.monitorDescription}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
            <span>
              {item.matchCount} match{item.matchCount === 1 ? "" : "es"}
            </span>
            <span>·</span>
            <span>{kAlertResourceTypeLabels[item.resourceType]}</span>
            <span>·</span>
            <span>{kAlertTimeFieldLabels[item.timeField]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(item.windowStart), "PPp")} →{" "}
            {format(new Date(item.windowEnd), "PPp")}
          </p>
        </div>
      </Link>
    </ComponentListItem>
  );
}

export function AlertItemSkeleton(props: { className?: string }) {
  return <ComponentListItemSkeleton className={props.className} />;
}

"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import Link from "next/link";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { Button } from "../ui/button";
import { LogsHeaderMenu } from "./logs-header-menu";

export function LogsHeader(props: {
  className?: string;
  orgId: string;
  projectId: string;
  onShowFiltersAndSort: (showFiltersAndSort: boolean) => void;
  showFiltersAndSort: boolean;
  filters?: IObjRecordQueryList;
}) {
  const hasFilters = (props.filters?.length ?? 0) > 0;
  const createMonitorHref = hasFilters
    ? `${kClientPaths.app.org.project.monitors.new(
        props.orgId,
        props.projectId
      )}?filters=${encodeURIComponent(JSON.stringify(props.filters))}`
    : null;

  return (
    <ComponentListHeader
      title="Logs"
      description="View and manage logs"
      button={
        <div className="flex items-center gap-2">
          {createMonitorHref ? (
            <Button variant="outline" size="sm" render={<Link href={createMonitorHref} />}>
              Create monitor from filters
            </Button>
          ) : null}
          <LogsHeaderMenu
            onShowFiltersAndSort={props.onShowFiltersAndSort}
            showFiltersAndSort={props.showFiltersAndSort}
          />
        </div>
      }
      className={props.className}
    />
  );
}

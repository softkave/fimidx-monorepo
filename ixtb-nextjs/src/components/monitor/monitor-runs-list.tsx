"use client";

import { useGetMonitorRuns } from "@/src/lib/clientApi/monitorRun";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import {
  IMonitorRun,
  kMonitorRunSuppressedReasonLabels,
} from "fimidx-core/definitions/monitorRun";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { ComponentListMessage } from "../internal/component-list/component-list-message";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination";
import { WrapLoader } from "../internal/wrap-loader";
import { Badge } from "../ui/badge";

export function MonitorRunsList(props: {
  projectId: string;
  monitorId: string;
  orgId?: string;
  className?: string;
}) {
  const { projectId, monitorId, className } = props;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const runsHook = useGetMonitorRuns({
    page,
    limit: pageSize,
    query: {
      projectId,
      monitorId: { eq: monitorId },
    },
    sort: [{ field: "createdAt", direction: "desc" }],
  });

  return (
    <div className={cn("flex flex-col w-full gap-3", className)}>
      <WrapLoader
        isLoading={runsHook.isLoading}
        error={runsHook.error}
        data={runsHook.data}
        render={(data) =>
          data.monitorRuns.length === 0 ? (
            <ComponentListMessage
              title="No runs yet"
              message="Runs appear after the monitor evaluates."
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2 w-full">
                {data.monitorRuns.map((run) => (
                  <MonitorRunItem
                    key={run.id}
                    run={run}
                    orgId={props.orgId}
                    projectId={projectId}
                  />
                ))}
              </ul>
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={runsHook.isLoading}
                setPage={setPage}
                setPageSize={setPageSize}
                className="py-2"
              />
            </>
          )
        }
      />
    </div>
  );
}

function MonitorRunItem(props: {
  run: IMonitorRun;
  orgId?: string;
  projectId: string;
}) {
  const { run, orgId, projectId } = props;
  const startedAt = format(new Date(run.startedAt), "PPp");

  return (
    <li className="rounded-md border p-3 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className="text-muted-foreground">{startedAt}</span>
        <div className="flex flex-wrap gap-1.5">
          {run.alertCreated ? (
            <Badge>Alert created</Badge>
          ) : (
            <Badge variant="secondary">No alert</Badge>
          )}
          {run.suppressedReason ? (
            <Badge variant="outline">
              {kMonitorRunSuppressedReasonLabels[run.suppressedReason]}
            </Badge>
          ) : null}
          {run.error ? <Badge variant="destructive">Error</Badge> : null}
        </div>
      </div>
      <div className="text-muted-foreground">
        {run.matchCount} match{run.matchCount === 1 ? "" : "es"} ·{" "}
        {run.durationMs}ms
      </div>
      {run.error ? <p className="text-destructive">{run.error}</p> : null}
      {run.alertId && orgId ? (
        <Link
          href={kClientPaths.app.org.project.alerts.single(
            orgId,
            projectId,
            run.alertId
          )}
          className="text-sm underline underline-offset-4"
        >
          View alert
        </Link>
      ) : null}
    </li>
  );
}

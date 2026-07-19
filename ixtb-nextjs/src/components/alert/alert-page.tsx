"use client";

import {
  acknowledgeAlert,
  useGetAlert,
  useGetAlertLogsInfinite,
} from "@/src/lib/clientApi/alert";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import {
  IAlert,
  kAlertResourceTypeLabels,
  kAlertTimeFieldLabels,
} from "fimidx-core/definitions/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ComponentListMessage } from "../internal/component-list/component-list-message";
import { PageError } from "../internal/error";
import { ProjectPage } from "../internal/project-page";
import { LogsTable, LogsTableSkeleton } from "../log/logs-table";
import { ProjectContainer } from "../project/project-container";
import { ProjectUpdateState } from "../project/project-update-state";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface IAlertPageProps {
  alertId: string;
  projectId: string;
  orgId: string;
  className?: string;
}

export function AlertPage(props: IAlertPageProps) {
  return (
    <ProjectPage>
      <ProjectContainer
        projectId={props.projectId}
        orgId={props.orgId}
        render={({ project }) => (
          <div
            className={cn(
              "flex flex-col max-w-lg mx-auto w-full",
              props.className
            )}
          >
            <ProjectUpdateState project={project} />
            <AlertDetail
              alertId={props.alertId}
              orgId={props.orgId}
              projectId={props.projectId}
            />
          </div>
        )}
      />
    </ProjectPage>
  );
}

function AlertDetail(props: {
  alertId: string;
  orgId: string;
  projectId: string;
}) {
  const { alertId, orgId, projectId } = props;
  const alertHook = useGetAlert(alertId);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const handleAcknowledge = useCallback(async () => {
    setIsAcknowledging(true);
    try {
      await acknowledgeAlert(alertId, true);
      toast.success("Alert acknowledged");
      await alertHook.mutate();
    } catch {
      // toasted
    } finally {
      setIsAcknowledging(false);
    }
  }, [alertId, alertHook]);

  if (alertHook.error) {
    return (
      <PageError
        error={alertHook.error}
        className="flex flex-col max-w-lg mx-auto"
        variant="secondary"
      />
    );
  }

  if (alertHook.isLoading || !alertHook.data?.alert) {
    return (
      <div className="p-4">
        <LogsTableSkeleton />
      </div>
    );
  }

  const alert = alertHook.data.alert;

  return (
    <div className="flex flex-col gap-6 p-4 pt-0 w-full">
      <AlertSnapshot
        alert={alert}
        orgId={orgId}
        projectId={projectId}
        isAcknowledging={isAcknowledging}
        onAcknowledge={handleAcknowledge}
      />
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Matching logs</h2>
        <AlertLogsList alertId={alertId} />
      </div>
    </div>
  );
}

function AlertSnapshot(props: {
  alert: IAlert;
  orgId: string;
  projectId: string;
  isAcknowledging: boolean;
  onAcknowledge: () => void;
}) {
  const { alert, orgId, projectId, isAcknowledging, onAcknowledge } = props;
  const acknowledged = !!alert.acknowledgedAt;
  const thresholdLabel =
    alert.alertIfCountGreaterThan == null
      ? "Alert on any match"
      : `Count > ${alert.alertIfCountGreaterThan}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold break-all">{alert.monitorName}</h1>
          {alert.monitorDescription ? (
            <p className="text-muted-foreground">{alert.monitorDescription}</p>
          ) : null}
        </div>
        <Badge variant={acknowledged ? "secondary" : "default"}>
          {acknowledged ? "Acknowledged" : "Open"}
        </Badge>
      </div>

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Matches</dt>
          <dd className="font-medium">{alert.matchCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Window</dt>
          <dd>
            {format(new Date(alert.windowStart), "PPp")} →{" "}
            {format(new Date(alert.windowEnd), "PPp")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Resource</dt>
          <dd>{kAlertResourceTypeLabels[alert.resourceType]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time field</dt>
          <dd>{kAlertTimeFieldLabels[alert.timeField]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Threshold</dt>
          <dd>{thresholdLabel}</dd>
        </div>
        {alert.query && Object.keys(alert.query).length > 0 ? (
          <div>
            <dt className="text-muted-foreground">Query</dt>
            <dd className="font-mono text-xs break-all">
              {JSON.stringify(alert.query)}
            </dd>
          </div>
        ) : null}
        {acknowledged && alert.acknowledgedAt ? (
          <div>
            <dt className="text-muted-foreground">Acknowledged</dt>
            <dd>{format(new Date(alert.acknowledgedAt), "PPp")}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {!acknowledged ? (
          <Button
            onClick={onAcknowledge}
            disabled={isAcknowledging}
            variant="default"
          >
            {isAcknowledging ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Acknowledge
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link
            href={kClientPaths.app.org.project.monitors.single(
              orgId,
              projectId,
              alert.monitorId
            )}
          >
            View monitor
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AlertLogsList(props: { alertId: string }) {
  const { alertId } = props;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { logs, error, isLoading, isLoadingMore, hasMore, setSize } =
    useGetAlertLogsInfinite({ alertId });

  useEffect(() => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    const el = sentinelRef.current;
    if (!el) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSize((size) => size + 1);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, setSize, logs.length]);

  if (error) {
    return (
      <PageError
        error={error}
        className="flex flex-col max-w-lg mx-auto"
        variant="secondary"
      />
    );
  }

  if (isLoading) {
    return <LogsTableSkeleton />;
  }

  if (logs.length === 0) {
    return (
      <ComponentListMessage
        title="No matching logs"
        message="No log entries were found for this alert window."
      />
    );
  }

  return (
    <div className="flex flex-col w-full">
      <LogsTable logs={logs} />
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex w-full justify-center py-4"
          aria-hidden="true"
        >
          {isLoadingMore ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

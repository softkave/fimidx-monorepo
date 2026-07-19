"use client";

import { useGetLogsInfinite } from "@/src/lib/clientApi/log.ts";
import { cn } from "@/src/lib/utils.ts";
import { GetLogsEndpointArgs, ILog } from "fimidx-core/definitions/log";
import { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OmitFrom } from "softkave-js-utils";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import { PageError } from "../internal/error.tsx";
import { Logs } from "./logs-list.tsx";
import { LogsTableSkeleton } from "./logs-table.tsx";

export type ILogListContainerFilter = OmitFrom<
  GetLogsEndpointArgs,
  "page" | "limit"
>;

export interface ILogListContainerProps {
  render?: (logs: ILog[]) => React.ReactNode;
  showNoLogsMessage?: boolean;
  className?: string;
  logsContainerClassName?: string;
  orgId: string;
  projectId: string;
  showFiltersAndSort?: boolean;
  onShowFilters?: () => void;
  filters?: IObjRecordQueryList;
  onFiltersChange?: (filters: IObjRecordQueryList) => void;
}

export function LogListContainer({
  render: inputRender,
  showNoLogsMessage = true,
  className,
  logsContainerClassName,
  orgId,
  projectId,
  showFiltersAndSort,
  onShowFilters,
  filters: controlledFilters,
  onFiltersChange,
}: ILogListContainerProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [internalFilters, setInternalFilters] = useState<IObjRecordQueryList>(
    []
  );
  const filters = controlledFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const query = useMemo(
    () => ({
      projectId,
      logsQuery: filters.length > 0 ? filters : undefined,
    }),
    [filters, projectId]
  );

  const { logs, error, isLoading, isLoadingMore, hasMore, setSize } =
    useGetLogsInfinite({ query });

  useEffect(() => {
    setSize(1);
  }, [filterKey, setSize]);

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

  const defaultRender = (loadedLogs: ILog[]) => {
    return (
      <Logs
        logs={loadedLogs}
        orgId={orgId}
        projectId={projectId}
        filters={filters}
        onFiltersChange={setFilters}
        showFiltersAndSort={showFiltersAndSort}
        onShowFilters={onShowFilters}
      />
    );
  };

  const render = inputRender ?? defaultRender;

  if (error) {
    return (
      <div className={cn("flex flex-col items-center w-full", className)}>
        <PageError
          error={error}
          className="flex flex-col max-w-lg mx-auto"
          variant="secondary"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center w-full", className)}>
        <LogsTableSkeleton />
      </div>
    );
  }

  if (logs.length === 0 && showNoLogsMessage) {
    return (
      <div className={cn("flex flex-col items-center w-full", className)}>
        <ComponentListMessage
          title="No logs found"
          message="Use the API to send logs to this project or change the filters"
          className="flex flex-col max-w-lg mx-auto"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <div
        className={cn(
          "flex flex-col items-center w-full",
          logsContainerClassName
        )}
      >
        {render(logs)}
        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex w-full max-w-lg justify-center py-4 mx-auto"
            aria-hidden="true"
          >
            {isLoadingMore && (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

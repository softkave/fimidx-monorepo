"use client";

import { useGetLogs } from "@/src/lib/clientApi/log.ts";
import { cn } from "@/src/lib/utils.ts";
import {
  GetLogsEndpointArgs,
  getLogsSchema,
  ILog,
} from "fimidx-core/definitions/log";
import { IObjPartQueryList } from "fimidx-core/definitions/obj";
import { ReactNode, useMemo, useState } from "react";
import { OmitFrom } from "softkave-js-utils";
import { z } from "zod";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination.tsx";
import { WrapLoader } from "../internal/wrap-loader.tsx";
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
}

export function LogListContainer({
  render: inputRender,
  showNoLogsMessage = true,
  className,
  logsContainerClassName,
  orgId,
  projectId,
  showFiltersAndSort,
}: ILogListContainerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [filters, setFilters] = useState<IObjPartQueryList>([]);

  const args = useMemo(
    (): z.infer<typeof getLogsSchema> => ({
      page,
      limit: pageSize,
      query: {
        projectId,
        logsQuery: filters.length > 0 ? { and: filters } : undefined,
      },
    }),
    [page, pageSize, filters, projectId]
  );

  const logsHook = useGetLogs(args);

  const defaultRender = (logs: ILog[]) => {
    return (
      <Logs
        logs={logs}
        orgId={orgId}
        projectId={projectId}
        filters={filters}
        onFiltersChange={setFilters}
        showFiltersAndSort={showFiltersAndSort}
      />
    );
  };

  const render = inputRender ?? defaultRender;

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={logsHook.isLoading}
        error={logsHook.error}
        data={logsHook.data}
        errorClassName="flex flex-col max-w-lg mx-auto"
        loadingClassName="flex flex-col max-w-lg mx-auto"
        render={(data) => {
          let paginationNode: ReactNode = null;

          if (page > 1 || data.hasMore) {
            paginationNode = (
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={logsHook.isLoading}
                setPage={setPage}
                setPageSize={setPageSize}
                className="py-4 max-w-lg pt-0 mx-auto"
              />
            );
          }

          return data.logs.length === 0 && showNoLogsMessage ? (
            <ComponentListMessage
              title="No logs found"
              message="Use the API to send logs to this project or change the filters"
              className="flex flex-col max-w-lg mx-auto"
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center w-full",
                logsContainerClassName
              )}
            >
              {render(data.logs)}
              {paginationNode}
            </div>
          );
        }}
        renderLoading={() => <LogsTableSkeleton />}
      />
    </div>
  );
}

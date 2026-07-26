"use client";

import { useGetMonitors } from "@/src/lib/clientApi/monitor.ts";
import { cn } from "@/src/lib/utils.ts";
import { IMonitor } from "fimidx-core/definitions/monitor";
import { useState } from "react";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination.tsx";
import { WrapLoader } from "../internal/wrap-loader.tsx";
import { MonitorsList } from "./monitors-list.tsx";

export interface IMonitorsListContainerProps {
  render?: (monitors: IMonitor[]) => React.ReactNode;
  showNoMonitorsMessage?: boolean;
  className?: string;
  monitorsContainerClassName?: string;
  projectId: string;
  orgId: string;
}

export function MonitorsListContainer({
  render: inputRender,
  showNoMonitorsMessage = true,
  className,
  monitorsContainerClassName,
  projectId,
  orgId,
}: IMonitorsListContainerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const monitorsHook = useGetMonitors({
    page,
    limit: pageSize,
    query: {
      projectId,
    },
  });

  const defaultRender = (monitors: IMonitor[]) => {
    return <MonitorsList monitors={monitors} orgId={orgId} />;
  };

  const render = inputRender ?? defaultRender;

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={monitorsHook.isLoading}
        error={monitorsHook.error}
        data={monitorsHook.data}
        render={(data) =>
          data.monitors.length === 0 && showNoMonitorsMessage ? (
            <ComponentListMessage
              title="No monitors"
              message="Create a monitor to get started"
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center w-full",
                monitorsContainerClassName
              )}
            >
              {render(data.monitors)}
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={monitorsHook.isLoading}
                setPage={setPage}
                setPageSize={setPageSize}
                className="py-4"
              />
            </div>
          )
        }
      />
    </div>
  );
}

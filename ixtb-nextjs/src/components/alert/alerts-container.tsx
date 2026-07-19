"use client";

import { useGetAlerts } from "@/src/lib/clientApi/alert.ts";
import { cn } from "@/src/lib/utils.ts";
import { IAlert } from "fimidx-core/definitions/alert";
import { useState } from "react";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination.tsx";
import { WrapLoader } from "../internal/wrap-loader.tsx";
import { AlertsList } from "./alerts-list.tsx";

export interface IAlertsListContainerProps {
  render?: (alerts: IAlert[]) => React.ReactNode;
  showNoAlertsMessage?: boolean;
  className?: string;
  alertsContainerClassName?: string;
  projectId: string;
  orgId: string;
}

export function AlertsListContainer({
  render: inputRender,
  showNoAlertsMessage = true,
  className,
  alertsContainerClassName,
  projectId,
  orgId,
}: IAlertsListContainerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const alertsHook = useGetAlerts({
    page,
    limit: pageSize,
    query: {
      projectId,
    },
  });

  const defaultRender = (alerts: IAlert[]) => {
    return <AlertsList alerts={alerts} orgId={orgId} />;
  };

  const render = inputRender ?? defaultRender;

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={alertsHook.isLoading}
        error={alertsHook.error}
        data={alertsHook.data}
        render={(data) =>
          data.alerts.length === 0 && showNoAlertsMessage ? (
            <ComponentListMessage
              title="No alerts"
              message="Alerts appear when a monitor matches"
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center w-full",
                alertsContainerClassName
              )}
            >
              {render(data.alerts)}
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={alertsHook.isLoading}
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

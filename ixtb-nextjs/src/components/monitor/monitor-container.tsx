"use client";

import { useGetMonitors } from "@/src/lib/clientApi/monitor";
import { IMonitor } from "fimidx-core/definitions/monitor";
import { useCallback, useMemo } from "react";
import { renderNotFoundError } from "../internal/page-not-found";
import { WrapLoader } from "../internal/wrap-loader";
import { MonitorDetail } from "./monitor-detail";

export interface IMonitorContainerRenderProps {
  monitor: IMonitor;
}

export interface IMonitorContainerProps {
  projectId: string;
  monitorId: string;
  orgId: string;
  render?: (response: IMonitorContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
}

const kMonitorNotFoundMessage = "Monitor not found";

export function MonitorContainer(props: IMonitorContainerProps) {
  const { projectId, monitorId, orgId, renderLoading, renderError } = props;

  const args = useMemo(
    () => ({
      page: 1,
      limit: 1,
      query: {
        projectId,
        id: {
          eq: monitorId,
        },
      },
    }),
    [monitorId, projectId]
  );

  const monitorsHook = useGetMonitors(args);

  const error =
    monitorsHook.error ||
    (!monitorsHook.isLoading &&
    monitorsHook.data &&
    monitorsHook.data.monitors.length === 0
      ? new Error(kMonitorNotFoundMessage)
      : undefined);
  const isLoading = monitorsHook.isLoading;
  const data = useMemo((): IMonitorContainerRenderProps | undefined => {
    if (monitorsHook.data?.monitors[0]) {
      return {
        monitor: monitorsHook.data.monitors[0],
      };
    }
  }, [monitorsHook.data]);

  const defaultRender = useCallback(
    (response: IMonitorContainerRenderProps) => (
      <MonitorDetail
        monitor={response.monitor}
        orgId={orgId}
        projectId={projectId}
      />
    ),
    [orgId, projectId]
  );

  const defaultRenderError = useCallback(
    (err: unknown) =>
      renderNotFoundError({
        error: err,
        notFoundMessage: kMonitorNotFoundMessage,
        title: "Monitor not found",
        description:
          "This monitor may have been deleted or you may not have access to it.",
      }),
    []
  );

  const render = props.render || defaultRender;

  return (
    <WrapLoader
      data={data}
      error={error}
      isLoading={isLoading}
      render={render}
      renderLoading={renderLoading}
      renderError={renderError ?? defaultRenderError}
    />
  );
}

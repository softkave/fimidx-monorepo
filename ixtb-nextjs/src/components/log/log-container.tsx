"use client";

import { useGetLogs } from "@/src/lib/clientApi/log";
import { getLogsSchema, ILog } from "fimidx-core/definitions/log";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import { WrapLoader } from "../internal/wrap-loader";
import { Log } from "./log";

export interface ILogContainerRenderProps {
  log: ILog;
}

export interface ILogContainerProps {
  logId: string;
  projectId: string;
  render?: (response: ILogContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
}

export function LogContainer(props: ILogContainerProps) {
  const { logId, projectId, renderLoading, renderError } = props;

  const args = useMemo(
    (): z.infer<typeof getLogsSchema> => ({
      page: 1,
      limit: 1,
      query: {
        projectId,
        id: {
          eq: logId,
        },
      },
    }),
    [logId, projectId]
  );

  const logHook = useGetLogs(args);

  const error = logHook.error;
  const isLoading = logHook.isLoading;
  const data = useMemo((): ILogContainerRenderProps | undefined => {
    if (logHook.data) {
      return {
        log: logHook.data.logs[0],
      };
    }
  }, [logHook.data]);

  const defaultRender = useCallback(
    (response: ILogContainerRenderProps) => <Log log={response.log} />,
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
      renderError={renderError}
    />
  );
}

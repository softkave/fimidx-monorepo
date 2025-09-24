"use client";

import { useGetApps } from "@/src/lib/clientApi/app";
import assert from "assert";
import { IApp } from "fimidx-core/definitions/app";
import { useCallback, useMemo } from "react";
import { WrapLoader } from "../internal/wrap-loader";
import { App, AppTab, kAppTabs } from "./app";

export interface IAppContainerRenderProps {
  app: IApp;
}

export interface IAppContainerProps {
  appId: string;
  defaultTab?: AppTab;
  render?: (response: IAppContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
  className?: string;
}

export function AppContainer(props: IAppContainerProps) {
  const {
    appId,
    defaultTab = kAppTabs.logs,
    renderLoading,
    renderError,
    className,
  } = props;
  const getAppsHook = useGetApps({
    query: {
      id: {
        eq: appId,
      },
    },
  });

  const isLoading = getAppsHook.isLoading;
  const error =
    getAppsHook.error ||
    (!isLoading && getAppsHook.data?.apps.length === 0
      ? new Error("App not found")
      : undefined);
  const data = useMemo((): IAppContainerRenderProps | undefined => {
    if (getAppsHook.data) {
      assert(getAppsHook.data.apps.length === 1, "App not found");
      return {
        app: getAppsHook.data.apps[0],
      };
    }
  }, [getAppsHook.data]);

  const defaultRender = useCallback(
    (response: IAppContainerRenderProps) => (
      <App app={response.app} defaultTab={defaultTab} className={className} />
    ),
    [defaultTab]
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

"use client";

import { useGetProjects } from "@/src/lib/clientApi/project";
import { IProject } from "fimidx-core/definitions/project";
import { useCallback, useMemo } from "react";
import { renderNotFoundError } from "../internal/page-not-found";
import { WrapLoader } from "../internal/wrap-loader";
import { kProjectTabs, Project, ProjectTab } from "./project";

export interface IProjectContainerRenderProps {
  project: IProject;
}

export interface IProjectContainerProps {
  projectId: string;
  orgId: string;
  defaultTab?: ProjectTab;
  render?: (response: IProjectContainerRenderProps) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
  className?: string;
}

const kProjectNotFoundMessage = "Project not found";

export function ProjectContainer(props: IProjectContainerProps) {
  const {
    projectId,
    orgId,
    defaultTab = kProjectTabs.logs,
    renderLoading,
    renderError,
    className,
  } = props;
  const getProjectsHook = useGetProjects({
    query: {
      orgId,
      id: {
        eq: projectId,
      },
    },
  });

  const isLoading = getProjectsHook.isLoading;
  const error =
    getProjectsHook.error ||
    (!isLoading &&
    getProjectsHook.data &&
    getProjectsHook.data.projects.length === 0
      ? new Error(kProjectNotFoundMessage)
      : undefined);
  const data = useMemo((): IProjectContainerRenderProps | undefined => {
    if (getProjectsHook.data?.projects[0]) {
      return {
        project: getProjectsHook.data.projects[0],
      };
    }
  }, [getProjectsHook.data]);

  const defaultRender = useCallback(
    (response: IProjectContainerRenderProps) => (
      <Project
        project={response.project}
        defaultTab={defaultTab}
        className={className}
      />
    ),
    [defaultTab, className]
  );

  const defaultRenderError = useCallback(
    (err: unknown) =>
      renderNotFoundError({
        error: err,
        notFoundMessage: kProjectNotFoundMessage,
        title: "Project not found",
        description:
          "This project may have been deleted or you may not have access to it.",
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

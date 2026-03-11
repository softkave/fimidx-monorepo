"use client";

import { useGetProjects } from "@/src/lib/clientApi/project";
import assert from "assert";
import { IProject } from "fimidx-core/definitions/project";
import { useCallback, useMemo } from "react";
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
    (!isLoading && getProjectsHook.data?.projects.length === 0
      ? new Error("Project not found")
      : undefined);
  const data = useMemo((): IProjectContainerRenderProps | undefined => {
    if (getProjectsHook.data) {
      assert.ok(
        getProjectsHook.data.projects.length === 1,
        "Project not found"
      );
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

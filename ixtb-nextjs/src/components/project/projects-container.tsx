"use client";

import { useGetProjects } from "@/src/lib/clientApi/project.ts";
import { cn } from "@/src/lib/utils.ts";
import {
  GetProjectsEndpointArgs,
  IProject,
} from "fimidx-core/definitions/project";
import { useState } from "react";
import { OmitFrom } from "softkave-js-utils";
import { ComponentListMessage } from "../internal/component-list/component-list-message.tsx";
import UnknownCountListPagination from "../internal/unknown-count-list-pagination.tsx";
import { WrapLoader } from "../internal/wrap-loader.tsx";
import { Projects } from "./projects-list.tsx";

export type IProjectListContainerFilter = OmitFrom<
  GetProjectsEndpointArgs,
  "page" | "limit"
>;

export interface IProjectListContainerProps {
  render?: (projects: IProject[]) => React.ReactNode;
  showNoProjectsMessage?: boolean;
  filter?: IProjectListContainerFilter;
  className?: string;
  projectsContainerClassName?: string;
  orgId: string;
}

export function ProjectListContainer({
  render: inputRender,
  showNoProjectsMessage = true,
  filter,
  className,
  projectsContainerClassName,
  orgId,
}: IProjectListContainerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const projectHooks = useGetProjects({
    query: {
      orgId: orgId,
    },
    page,
    limit: pageSize,
    ...filter,
  });

  const defaultRender = (projects: IProject[]) => {
    return <Projects projects={projects} />;
  };

  const render = inputRender ?? defaultRender;

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <WrapLoader
        isLoading={projectHooks.isLoading}
        error={projectHooks.error}
        data={projectHooks.data}
        render={(data) =>
          data.projects.length === 0 && showNoProjectsMessage ? (
            <ComponentListMessage
              title="No projects found"
              message="Add an project to get started"
            />
          ) : (
            <div
              className={cn(
                "flex flex-col items-center w-full",
                projectsContainerClassName
              )}
            >
              {render(data.projects)}
              <UnknownCountListPagination
                hasMore={data.hasMore}
                page={page}
                pageSize={pageSize}
                disabled={projectHooks.isLoading}
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

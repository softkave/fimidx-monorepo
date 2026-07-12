"use client";

import { cn } from "@/src/lib/utils.ts";
import { useState } from "react";
import { ProjectPage } from "../internal/project-page.tsx";
import { LogListContainer } from "./logs-container.tsx";
import { LogsHeader } from "./logs-header.tsx";

export function LogsPage(props: {
  orgId: string;
  projectId: string;
  className?: string;
  withProjectWrapper?: boolean;
}) {
  const { withProjectWrapper = true } = props;
  const [showFiltersAndSort, setShowFiltersAndSort] = useState(false);

  const contentNode = (
    <div className={cn("flex flex-col", props.className)}>
      <LogsHeader
        orgId={props.orgId}
        projectId={props.projectId}
        onShowFiltersAndSort={setShowFiltersAndSort}
        showFiltersAndSort={showFiltersAndSort}
      />
      <LogListContainer
        orgId={props.orgId}
        projectId={props.projectId}
        showNoLogsMessage={false}
        showFiltersAndSort={showFiltersAndSort}
      />
    </div>
  );

  if (withProjectWrapper) {
    return <ProjectPage>{contentNode}</ProjectPage>;
  }

  return contentNode;
}

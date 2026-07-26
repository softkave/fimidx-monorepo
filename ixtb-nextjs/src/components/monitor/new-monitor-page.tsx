"use client";

import { cn } from "@/src/lib/utils";
import type { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import { ProjectPage } from "../internal/project-page";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { ProjectContainer } from "../project/project-container";
import { ProjectUpdateState } from "../project/project-update-state";
import { MonitorForm } from "./monitor-form";

export function NewMonitorPage(props: {
  orgId: string;
  projectId: string;
  initialFilters?: IObjRecordQueryList;
  className?: string;
}) {
  return (
    <ProjectPage>
      <ProjectContainer
        projectId={props.projectId}
        orgId={props.orgId}
        render={({ project }) => (
          <div
            className={cn("flex flex-col max-w-lg mx-auto", props.className)}
          >
            <ProjectUpdateState project={project} />
            <ComponentListHeader
              title="New Monitor"
              description="Watch matching logs and get alerted when they appear."
            />
            <div className="px-4 pb-8">
              <MonitorForm
                orgId={props.orgId}
                projectId={props.projectId}
                initialFilters={props.initialFilters}
              />
            </div>
          </div>
        )}
      />
    </ProjectPage>
  );
}

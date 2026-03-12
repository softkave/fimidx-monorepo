"use client";

import { cn } from "@/src/lib/utils";
import { ProjectPage } from "../internal/project-page";
import { ProjectContainer } from "../project/project-container";
import { ProjectUpdateState } from "../project/project-update-state";
import { ClientTokenContainer } from "./client-token-container";

export interface IClientTokenPageProps {
  clientTokenId: string;
  projectId: string;
  orgId: string;
  className?: string;
}

export function ClientTokenPage(props: IClientTokenPageProps) {
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
            <ClientTokenContainer
              projectId={props.projectId}
              clientTokenId={props.clientTokenId}
              groupId={project.orgId}
            />
          </div>
        )}
      />
    </ProjectPage>
  );
}

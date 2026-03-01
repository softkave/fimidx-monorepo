"use client";

import { ProjectContainer } from "../project/project-container";
import { ProjectSidebarGroup } from "./project-sidebar-group";

export function ProjectSidebarGroupContainer(props: {
  orgId: string;
  projectId: string;
}) {
  return (
    <ProjectContainer
      projectId={props.projectId}
      render={({ project }) => (
        <ProjectSidebarGroup
          orgId={props.orgId}
          projectId={project.id}
          name={project.name}
        />
      )}
      renderLoading={() => null}
      renderError={() => null}
    />
  );
}

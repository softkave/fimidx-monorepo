"use client";

import { IProject } from "fimidx-core/definitions/project";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { ProjectItemMenu } from "./project-item-menu";

export function ProjectHeader(props: {
  project: IProject;
  className?: string;
}) {
  const { project, className } = props;

  return (
    <ComponentListHeader
      title={project.name}
      description={project.description ?? undefined}
      button={<ProjectItemMenu project={project} />}
      className={className}
    />
  );
}

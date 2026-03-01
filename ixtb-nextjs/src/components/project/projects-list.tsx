import { IProject } from "fimidx-core/definitions/project";
import { ComponentList } from "../internal/component-list/component-list";
import { ComponentListMessage } from "../internal/component-list/component-list-message";
import { ProjectItem, ProjectItemSkeleton } from "./project-item";

export interface IProjectsProps {
  projects: IProject[];
}

export function ProjectItemEmpty() {
  return (
    <ComponentListMessage
      title="No projects found"
      message="Add an project to get started"
    />
  );
}

export function Projects(props: IProjectsProps) {
  if (props.projects.length === 0) {
    return <ProjectItemEmpty />;
  }

  return (
    <ComponentList
      count={props.projects.length}
      renderItem={(index) => (
        <ProjectItem
          key={props.projects[index].id}
          item={props.projects[index]}
        />
      )}
    />
  );
}

export function ProjectsSkeleton() {
  return (
    <ComponentList
      count={3}
      renderItem={(index) => <ProjectItemSkeleton key={index} />}
    />
  );
}

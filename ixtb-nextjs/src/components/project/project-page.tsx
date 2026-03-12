import { ProjectPage as InternalProjectPage } from "../internal/project-page";
import { ProjectTab } from "./project";
import { ProjectContainer } from "./project-container";

export interface IProjectPageProps {
  projectId: string;
  orgId: string;
  defaultTab: ProjectTab;
  className?: string;
}

export function ProjectPage(props: IProjectPageProps) {
  return (
    <InternalProjectPage>
      <ProjectContainer
        projectId={props.projectId}
        orgId={props.orgId}
        defaultTab={props.defaultTab}
        className={props.className}
      />
    </InternalProjectPage>
  );
}

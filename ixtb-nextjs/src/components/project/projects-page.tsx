import { ProjectPage } from "../internal/project-page";
import { ProjectListContainer } from "./projects-container";
import { ProjectsHeader } from "./projects-header";

export function ProjectsPage(props: {
  orgId: string;
  className?: string;
  withProjectWrapper?: boolean;
}) {
  const { withProjectWrapper = true } = props;
  const contentNode = (
    <div className="flex flex-col max-w-lg mx-auto">
      <ProjectsHeader orgId={props.orgId} />
      <ProjectListContainer orgId={props.orgId} showNoProjectsMessage={false} />
    </div>
  );

  if (withProjectWrapper) {
    return <ProjectPage>{contentNode}</ProjectPage>;
  }

  return contentNode;
}

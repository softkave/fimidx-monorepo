import { cn } from "@/src/lib/utils.ts";
import { ProjectPage } from "../internal/project-page.tsx";
import { MonitorsListContainer } from "./monitors-container.tsx";
import { MonitorsHeader } from "./monitors-header.tsx";

export function MonitorsPage(props: {
  projectId: string;
  orgId: string;
  className?: string;
  withProjectWrapper?: boolean;
}) {
  const { withProjectWrapper = true } = props;
  const contentNode = (
    <div className={cn("flex flex-col max-w-lg mx-auto", props.className)}>
      <MonitorsHeader projectId={props.projectId} orgId={props.orgId} />
      <MonitorsListContainer
        projectId={props.projectId}
        orgId={props.orgId}
        showNoMonitorsMessage={false}
      />
    </div>
  );

  if (withProjectWrapper) {
    return <ProjectPage>{contentNode}</ProjectPage>;
  }

  return contentNode;
}

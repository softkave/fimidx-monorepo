import { cn } from "@/src/lib/utils.ts";
import { ProjectPage } from "../internal/project-page.tsx";
import { AlertsListContainer } from "./alerts-container.tsx";
import { AlertsHeader } from "./alerts-header.tsx";

export function AlertsPage(props: {
  projectId: string;
  orgId: string;
  className?: string;
  withProjectWrapper?: boolean;
}) {
  const { withProjectWrapper = true } = props;
  const contentNode = (
    <div className={cn("flex flex-col max-w-lg mx-auto", props.className)}>
      <AlertsHeader />
      <AlertsListContainer
        projectId={props.projectId}
        orgId={props.orgId}
        showNoAlertsMessage={false}
      />
    </div>
  );

  if (withProjectWrapper) {
    return <ProjectPage>{contentNode}</ProjectPage>;
  }

  return contentNode;
}

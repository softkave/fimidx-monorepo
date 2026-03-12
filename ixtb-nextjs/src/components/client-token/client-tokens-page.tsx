import { cn } from "@/src/lib/utils.ts";
import { ProjectPage } from "../internal/project-page.tsx";
import { ClientTokenListContainer } from "./client-tokens-container.tsx";
import { ClientTokensHeader } from "./client-tokens-header.tsx";

export function ClientTokensPage(props: {
  projectId: string;
  orgId: string;
  className?: string;
  title?: string;
  description?: string;
  withProjectWrapper?: boolean;
}) {
  const { withProjectWrapper = true } = props;
  const contentNode = (
    <div className={cn("flex flex-col max-w-lg mx-auto", props.className)}>
      <ClientTokensHeader
        projectId={props.projectId}
        orgId={props.orgId}
        title={props.title}
        description={props.description}
      />
      <ClientTokenListContainer
        projectId={props.projectId}
        showNoClientTokensMessage={false}
        groupId={props.orgId}
      />
    </div>
  );

  if (withProjectWrapper) {
    return <ProjectPage>{contentNode}</ProjectPage>;
  }

  return contentNode;
}

import { ProjectPage } from "../internal/project-page";
import { OrgTab } from "./org";
import { OrgContainer } from "./org-container";

export interface IOrgPageProps {
  orgId: string;
  defaultTab: OrgTab;
}

export function OrgPage(props: IOrgPageProps) {
  return (
    <ProjectPage>
      <OrgContainer orgId={props.orgId} defaultTab={props.defaultTab} />
    </ProjectPage>
  );
}

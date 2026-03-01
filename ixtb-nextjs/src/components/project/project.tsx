import { IProject } from "fimidx-core/definitions/project";
import { ValueOf } from "type-fest";
import { cn } from "../../lib/utils";
import { ClientTokensPage } from "../client-token/client-tokens-page";
import { LogsPage } from "../log/logs-page";
import { ProjectUpdateState } from "./project-update-state";

export const kProjectTabs = {
  clientTokens: "clientTokens",
  logs: "logs",
} as const;

export type ProjectTab = ValueOf<typeof kProjectTabs>;

export interface IProjectProps {
  project: IProject;
  defaultTab: ProjectTab;
  className?: string;
}

export function Project(props: IProjectProps) {
  const { defaultTab, className } = props;
  let contentNode: React.ReactNode = null;

  if (defaultTab === kProjectTabs.clientTokens) {
    contentNode = (
      <ClientTokensPage
        projectId={props.project.id}
        orgId={props.project.orgId}
        withProjectWrapper={false}
      />
    );
  } else if (defaultTab === kProjectTabs.logs) {
    contentNode = (
      <LogsPage
        projectId={props.project.id}
        orgId={props.project.orgId}
        withProjectWrapper={false}
      />
    );
  }

  return (
    <div className={cn("max-w-md md:max-w-lg mx-auto w-full", className)}>
      {/* <ProjectHeader project={props.project} /> */}
      <ProjectUpdateState project={props.project} />
      {contentNode}
    </div>
  );
}

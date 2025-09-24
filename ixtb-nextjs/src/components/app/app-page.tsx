import { AppPage as InternalAppPage } from "../internal/app-page";
import { AppTab } from "./app";
import { AppContainer } from "./app-container";

export interface IAppPageProps {
  appId: string;
  defaultTab: AppTab;
  className?: string;
}

export function AppPage(props: IAppPageProps) {
  return (
    <InternalAppPage>
      <AppContainer
        appId={props.appId}
        defaultTab={props.defaultTab}
        className={props.className}
      />
    </InternalAppPage>
  );
}

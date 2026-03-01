import { ProjectPage } from "../internal/project-page";
import { OrgListContainer } from "./orgs-container";
import { OrgsHeader } from "./orgs-header";

export function OrgsPage() {
  return (
    <ProjectPage>
      <div className="flex flex-col max-w-lg mx-auto">
        <OrgsHeader />
        <OrgListContainer showNoOrgsMessage={false} />
      </div>
    </ProjectPage>
  );
}

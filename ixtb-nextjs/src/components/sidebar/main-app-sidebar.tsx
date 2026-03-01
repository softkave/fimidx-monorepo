import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/src/components/ui/sidebar";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import Link from "next/link";
import { HomeSidebarGroup } from "./home-sidebar-group";
import { OrgSidebarGroupContainer } from "./org-sidebar-group-container";
import { ProjectSidebarGroupContainer } from "./project-sidebar-group-container";

export function MainAppSidebar(props: { orgId?: string; projectId?: string }) {
  const { orgId, projectId } = props;

  const sidebar = (
    <Sidebar>
      <SidebarHeader>
        <div className="text-lg font-black p-2 pt-3 text-muted-foreground">
          <Link href={kClientPaths.project.index}>{kAppConstants.name}</Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <HomeSidebarGroup />
        {orgId && <OrgSidebarGroupContainer orgId={orgId} />}
        {orgId && projectId && (
          <ProjectSidebarGroupContainer orgId={orgId} projectId={projectId} />
        )}
      </SidebarContent>
    </Sidebar>
  );

  return sidebar;
}

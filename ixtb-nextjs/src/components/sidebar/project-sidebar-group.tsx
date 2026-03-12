import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { KeyIcon, LogsIcon } from "lucide-react";
import { useMemo } from "react";
import { ISidebarItem } from "./types";

function getItems(orgId: string, projectId: string) {
  const items: ISidebarItem[] = [
    {
      title: "Client Tokens",
      url: kClientPaths.app.org.project.clientToken.index(orgId, projectId),
      icon: KeyIcon,
    },
    {
      title: "Logs",
      url: kClientPaths.app.org.project.log.index(orgId, projectId),
      icon: LogsIcon,
    },
  ];

  return items;
}

export function ProjectSidebarGroup(props: {
  orgId: string;
  projectId: string;
  name: string;
}) {
  const items = useMemo(
    () => getItems(props.orgId, props.projectId),
    [props.orgId, props.projectId]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.name}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

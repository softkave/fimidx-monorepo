"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/src/components/ui/sidebar";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { AppWindowIcon } from "lucide-react";
import { useMemo } from "react";
import { SidebarNavItems } from "./sidebar-nav-items";
import { ISidebarItem } from "./types";

function getItems(orgId: string) {
  const items: ISidebarItem[] = [
    {
      title: "Projects",
      url: kClientPaths.app.org.project.index(orgId),
      icon: AppWindowIcon,
      // Avoid lighting up for every `/projects/:projectId/...` route.
      match: "exact",
    },
  ];

  return items;
}

export function OrgSidebarGroup(props: { orgId: string; name: string }) {
  const items = useMemo(() => getItems(props.orgId), [props.orgId]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.name}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarNavItems items={items} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

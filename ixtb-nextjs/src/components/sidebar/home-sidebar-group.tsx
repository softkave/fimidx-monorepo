"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/src/components/ui/sidebar";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { BoxesIcon } from "lucide-react";
import { SidebarNavItems } from "./sidebar-nav-items";
import { ISidebarItem } from "./types";

const items: ISidebarItem[] = [
  {
    title: "Orgs",
    url: kClientPaths.app.org.index,
    icon: BoxesIcon,
    // Avoid lighting up for every `/orgs/:orgId/...` route.
    match: "exact",
  },
];

export function HomeSidebarGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Home</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarNavItems items={items} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

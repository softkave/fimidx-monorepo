"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ISidebarItem } from "./types";

function isItemActive(pathname: string, item: ISidebarItem): boolean {
  if (item.match === "exact") {
    return pathname === item.url;
  }
  return pathname === item.url || pathname.startsWith(`${item.url}/`);
}

export function SidebarNavItems(props: { items: ISidebarItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {props.items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isItemActive(pathname, item)}>
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

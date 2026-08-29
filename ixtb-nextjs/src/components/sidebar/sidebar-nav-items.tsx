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
          <SidebarMenuButton
            render={<Link href={item.url} />}
            isActive={isItemActive(pathname, item)}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

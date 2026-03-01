"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths.ts";
import { cn } from "@/src/lib/utils.ts";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import Link from "next/link";
import { useContext } from "react";
import { GlobalStateContext } from "../contexts/global-state-context.tsx";
import { useSidebar } from "../ui/sidebar.tsx";

export interface IProjectHeaderTitleProps {
  className?: string;
}

export function ProjectHeaderTitle(props: IProjectHeaderTitleProps) {
  const { className } = props;
  const sidebarHook = useSidebar();
  const globalState = useContext(GlobalStateContext);
  const showTitle = !sidebarHook.open;
  const spaceName = globalState.projectName ?? globalState.orgName;

  return (
    <div className={cn("flex-1 text-lg font-black", className)}>
      {spaceName ? (
        <Link href={kClientPaths.project.index}>{spaceName}</Link>
      ) : showTitle ? (
        <Link href={kClientPaths.project.index}>{kAppConstants.name}</Link>
      ) : null}
    </div>
  );
}

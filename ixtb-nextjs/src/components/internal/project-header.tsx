import { cn } from "@/src/lib/utils.ts";
import { SidebarTrigger } from "../ui/sidebar.tsx";
import { ProjectHeaderTitle } from "./project-header-title.tsx";
import { UserMenu } from "./user-menu.tsx";

export interface IProjectHeaderProps {
  className?: string;
  showSidebarTrigger?: boolean;
}

export function ProjectHeader(props: IProjectHeaderProps) {
  const { showSidebarTrigger } = props;

  return (
    <div
      className={cn(
        "grid p-4 items-center gap-x-2",
        showSidebarTrigger
          ? "grid-cols-[auto_1fr_auto]"
          : "grid-cols-[1fr_auto]",
        props.className
      )}
    >
      {showSidebarTrigger && (
        <SidebarTrigger variant="outline" className="size-9 cursor-pointer" />
      )}
      <ProjectHeaderTitle />
      <UserMenu />
    </div>
  );
}

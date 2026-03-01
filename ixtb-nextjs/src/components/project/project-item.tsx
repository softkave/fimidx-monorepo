import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { IProject } from "fimidx-core/definitions/project";
import Link from "next/link";
import { ComponentListItemSkeleton } from "../internal/component-list/component-list-item-skeleton.tsx";
import { ComponentListItem } from "../internal/component-list/component-list-item.tsx";
import { ProjectItemMenu } from "./project-item-menu.tsx";

export interface IProjectItemProps {
  item: IProject;
}

export function ProjectItem(props: IProjectItemProps) {
  return (
    <ComponentListItem button={<ProjectItemMenu project={props.item} />}>
      <Link
        href={kClientPaths.project.org.project.single(
          props.item.orgId,
          props.item.id
        )}
        className="flex-1"
      >
        <div>
          <h3 className="font-medium">{props.item.name}</h3>
          <p className="text-muted-foreground">{props.item.description}</p>
        </div>
      </Link>
    </ComponentListItem>
  );
}

export function ProjectItemSkeleton(props: { className?: string }) {
  return <ComponentListItemSkeleton className={props.className} />;
}

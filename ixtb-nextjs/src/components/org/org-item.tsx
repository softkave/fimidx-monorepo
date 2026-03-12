import { IOrg } from "@/src/definitions/org";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import Link from "next/link";
import { ComponentListItem } from "../internal/component-list/component-list-item";
import { ComponentListItemSkeleton } from "../internal/component-list/component-list-item-skeleton";
import { OrgItemMenu } from "./org-item-menu";

export interface IOrgItemProps {
  item: IOrg;
}

export function OrgItem(props: IOrgItemProps) {
  return (
    <ComponentListItem button={<OrgItemMenu org={props.item} />}>
      <Link
        href={kClientPaths.app.org.single(props.item.id)}
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

export function OrgItemSkeleton(props: { className?: string }) {
  return <ComponentListItemSkeleton className={props.className} />;
}

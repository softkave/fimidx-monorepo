import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import Link from "next/link";
import { ComponentListItemSkeleton } from "../internal/component-list/component-list-item-skeleton.tsx";
import { ComponentListItem } from "../internal/component-list/component-list-item.tsx";
import { ClientTokenItemMenu } from "./client-token-item-menu.tsx";

export interface IClientTokenItemProps {
  item: IClientToken;
}

export function ClientTokenItem(props: IClientTokenItemProps) {
  const orgId = props.item.meta?.orgId;
  const projectId = props.item.meta?.projectId;

  if (!orgId || !projectId) {
    return null;
  }

  return (
    <ComponentListItem
      button={
        <ClientTokenItemMenu clientToken={props.item} projectId={projectId} />
      }
    >
      <Link
        href={kClientPaths.project.org.project.clientToken.single(
          orgId,
          projectId,
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

export function ClientTokenItemSkeleton(props: { className?: string }) {
  return <ComponentListItemSkeleton className={props.className} />;
}

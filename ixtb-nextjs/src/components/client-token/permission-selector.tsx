"use client";

import { cn } from "@/src/lib/utils";
import type { IPermissionAtom } from "fimidx-core/definitions/permission";
import {
  kFimidxPermissions,
  kFimidxPermissionsList,
} from "fimidx-core/definitions/permission";
import { useMemo } from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

const selectablePermissions = kFimidxPermissionsList.filter(
  (a) => a !== kFimidxPermissions.wildcard
);

/** Labels and descriptions for each permission. Add an entry when a new permission is added to kFimidxPermissionsList. */
export const kPermissionLabels: Record<
  string,
  { label: string; description: string }
> = {
  [kFimidxPermissions.group.read]: {
    label: "Group – read",
    description: "View organization details",
  },
  [kFimidxPermissions.group.mutate]: {
    label: "Group – mutate",
    description: "Create or update organization",
  },
  [kFimidxPermissions.group.delete]: {
    label: "Group – delete",
    description: "Delete organization",
  },
  [kFimidxPermissions.project.read]: {
    label: "Project – read",
    description: "View project details and list projects",
  },
  [kFimidxPermissions.project.mutate]: {
    label: "Project – mutate",
    description: "Create or update project",
  },
  [kFimidxPermissions.project.delete]: {
    label: "Project – delete",
    description: "Delete project",
  },
  [kFimidxPermissions.member.read]: {
    label: "Member – read",
    description: "View members",
  },
  [kFimidxPermissions.member.readPermissions]: {
    label: "Member – read permissions",
    description: "View member permissions",
  },
  [kFimidxPermissions.member.mutate]: {
    label: "Member – mutate",
    description: "Add or update members and their permissions",
  },
  [kFimidxPermissions.member.remove]: {
    label: "Member – remove",
    description: "Remove members",
  },
  [kFimidxPermissions.log.read]: {
    label: "Log – read",
    description: "Read and query logs",
  },
  [kFimidxPermissions.log.ingest]: {
    label: "Log – ingest",
    description: "Ingest log entries",
  },
  [kFimidxPermissions.clientToken.read]: {
    label: "Client token – read",
    description: "View and encode client tokens",
  },
  [kFimidxPermissions.clientToken.readPermissions]: {
    label: "Client token – read permissions",
    description: "View client token permissions",
  },
  [kFimidxPermissions.clientToken.mutate]: {
    label: "Client token – mutate",
    description: "Create or update client tokens and their permissions",
  },
  [kFimidxPermissions.clientToken.delete]: {
    label: "Client token – delete",
    description: "Delete client tokens",
  },
  [kFimidxPermissions.monitor.read]: {
    label: "Monitor – read",
    description: "View monitors",
  },
  [kFimidxPermissions.monitor.mutate]: {
    label: "Monitor – mutate",
    description: "Create or update monitors",
  },
  [kFimidxPermissions.monitor.delete]: {
    label: "Monitor – delete",
    description: "Delete monitors",
  },
  [kFimidxPermissions.callback.read]: {
    label: "Callback – read",
    description: "View callbacks",
  },
  [kFimidxPermissions.callback.mutate]: {
    label: "Callback – mutate",
    description: "Create or update callbacks",
  },
  [kFimidxPermissions.callback.delete]: {
    label: "Callback – delete",
    description: "Delete callbacks",
  },
  [kFimidxPermissions.obj.read]: {
    label: "Obj – read",
    description: "Read objects and object fields",
  },
  [kFimidxPermissions.obj.mutate]: {
    label: "Obj – mutate",
    description: "Create, update, or set objects",
  },
  [kFimidxPermissions.obj.delete]: {
    label: "Obj – delete",
    description: "Delete objects",
  },
};

function permissionLabel(action: string): string {
  return kPermissionLabels[action]?.label ?? action.replace(":", " – ");
}

function permissionDescription(action: string): string {
  return (
    kPermissionLabels[action]?.description ??
    `Permission: ${action.replace(":", " – ")}`
  );
}

export interface PermissionSelectorProps {
  value: IPermissionAtom[];
  onChange?: (value: IPermissionAtom[]) => void;
  targetId: string;
  readonly?: boolean;
  className?: string;
}

export function PermissionSelector({
  value,
  onChange,
  targetId,
  readonly = false,
  className,
}: PermissionSelectorProps) {
  const selectedActions = useMemo(
    () =>
      new Set(value.filter((p) => p.target === targetId).map((p) => p.action)),
    [value, targetId]
  );

  const handleToggle = (action: string, checked: boolean) => {
    if (readonly || !onChange) return;
    if (checked) {
      onChange([
        ...value,
        { entity: "client-token", action, target: targetId },
      ]);
    } else {
      onChange(
        value.filter((p) => !(p.action === action && p.target === targetId))
      );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-muted-foreground">
        Permissions
      </div>
      <div className="flex flex-col gap-2">
        {selectablePermissions.map((action) => (
          <div
            key={action}
            className={cn(
              "flex items-center gap-2",
              readonly && "cursor-default"
            )}
          >
            <Checkbox
              id={`permission-${action}`}
              checked={selectedActions.has(action)}
              onCheckedChange={(checked) =>
                handleToggle(action, checked === true)
              }
              disabled={readonly}
            />
            <Label
              htmlFor={readonly ? undefined : `permission-${action}`}
              className="text-sm font-normal cursor-pointer flex flex-col gap-1 items-start"
              title={permissionDescription(action)}
            >
              <span>{permissionLabel(action)}</span>
              <span className="text-xs text-muted-foreground text-left">
                {permissionDescription(action)}
              </span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

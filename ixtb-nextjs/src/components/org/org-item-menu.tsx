"use client";

import { IOrg } from "@/src/definitions/org";
import { useDeleteOrg } from "@/src/lib/clientApi/org";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import { isString } from "lodash-es";
import { Ellipsis, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteResourceDialog } from "../internal/delete-resource-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { OrgFormSheet } from "./org-form-sheet";

export interface IOrgItemMenuProps {
  org: IOrg;
  onDeleting?: () => void;
  onDeleted?: () => void;
  routeAfterDelete?: string | boolean;
}

export function OrgItemMenu(props: IOrgItemMenuProps) {
  const { org, onDeleting, onDeleted, routeAfterDelete = true } = props;

  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const deleteOrgHook = useDeleteOrg({
    orgId: org.id,
    onSuccess: () => {
      toast.success("Org deleted");
      onDeleted?.();
      if (routeAfterDelete) {
        router.push(
          isString(routeAfterDelete)
            ? routeAfterDelete
            : kClientPaths.app.org.index
        );
      }
    },
  });

  const handleDelete = () => {
    onDeleting?.();
    deleteOrgHook.trigger({
      id: org.id,
    });
  };

  const deleteOrgDialog = useDeleteResourceDialog({
    title: "Delete Organization",
    description: "Are you sure you want to delete this organization?",
    onConfirm: handleDelete,
  });

  const isMutating = deleteOrgHook.isMutating;

  return (
    <>
      {deleteOrgDialog.DeleteResourceDialog()}
      <OrgFormSheet org={org} onOpenChange={setIsEditing} isOpen={isEditing} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={isMutating}
            className={cn(isMutating && "animate-pulse")}
          >
            {isMutating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ellipsis className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setIsEditing(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={deleteOrgDialog.trigger}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

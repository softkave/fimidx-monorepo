"use client";

import { useDeleteProject } from "@/src/lib/clientApi/project";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import { IProject } from "fimidx-core/definitions/project";
import { isString } from "lodash-es";
import { Ellipsis, Loader2 } from "lucide-react";
import { useRouter } from "@/src/lib/clientHooks/useRouter";
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
import { ProjectFormSheet } from "./project-form-sheet";

export interface IProjectItemMenuProps {
  project: IProject;
  onDeleting?: () => void;
  onDeleted?: () => void;
  routeAfterDelete?: string | boolean;
}

export function ProjectItemMenu(props: IProjectItemMenuProps) {
  const { project, onDeleting, onDeleted, routeAfterDelete = true } = props;

  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const deleteProjectHook = useDeleteProject({
    onSuccess: () => {
      toast.success("Project deleted");
      onDeleted?.();
      if (routeAfterDelete) {
        router.push(
          isString(routeAfterDelete)
            ? routeAfterDelete
            : kClientPaths.app.org.project.index(project.orgId)
        );
      }
    },
  });

  const handleDelete = () => {
    onDeleting?.();
    deleteProjectHook.trigger({
      query: {
        orgId: project.orgId,
        id: {
          eq: project.id,
        },
      },
    });
  };

  const deleteProjectDialog = useDeleteResourceDialog({
    title: "Delete Project",
    description: "Are you sure you want to delete this project?",
    onConfirm: handleDelete,
  });

  const isMutating = deleteProjectHook.isMutating;

  return (
    <>
      {deleteProjectDialog.DeleteResourceDialog()}
      <ProjectFormSheet
        project={project}
        orgId={project.orgId}
        onOpenChange={setIsEditing}
        isOpen={isEditing}
      />
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
          <DropdownMenuItem onSelect={deleteProjectDialog.trigger}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

"use client";

import { deleteMonitors } from "@/src/lib/clientApi/monitor";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import { IMonitor } from "fimidx-core/definitions/monitor";
import { isString } from "lodash-es";
import { Ellipsis, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDeleteResourceDialog } from "../internal/delete-resource-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { kApiMonitorKeys } from "@/src/lib/clientApi/apikeys";

export interface IMonitorItemMenuProps {
  monitor: IMonitor;
  orgId: string;
  projectId: string;
  onDeleting?: () => void;
  onDeleted?: () => void;
  routeAfterDelete?: string | boolean;
}

export function MonitorItemMenu(props: IMonitorItemMenuProps) {
  const {
    monitor,
    orgId,
    projectId,
    onDeleting,
    onDeleted,
    routeAfterDelete = true,
  } = props;
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);

  const handleDelete = async () => {
    onDeleting?.();
    setIsMutating(true);
    try {
      await deleteMonitors({
        query: {
          projectId,
          id: { eq: monitor.id },
        },
      });
      await mutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          key[0].startsWith(kApiMonitorKeys.getMonitors()),
        undefined,
        { revalidate: true }
      );
      toast.success("Monitor deleted");
      onDeleted?.();
      if (routeAfterDelete) {
        router.push(
          isString(routeAfterDelete)
            ? routeAfterDelete
            : kClientPaths.app.org.project.monitors.index(orgId, projectId)
        );
      }
    } catch {
      // handleResponse already toasts errors
    } finally {
      setIsMutating(false);
    }
  };

  const deleteDialog = useDeleteResourceDialog({
    title: "Delete Monitor",
    description: "Are you sure you want to delete this monitor?",
    onConfirm: handleDelete,
  });

  return (
    <>
      {deleteDialog.DeleteResourceDialog()}
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
          <DropdownMenuItem
            onSelect={() =>
              router.push(
                kClientPaths.app.org.project.monitors.edit(
                  orgId,
                  projectId,
                  monitor.id
                )
              )
            }
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={deleteDialog.trigger}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

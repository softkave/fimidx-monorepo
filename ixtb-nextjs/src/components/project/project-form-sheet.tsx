"use client";

import { IProject } from "fimidx-core/definitions/project";
import { useCallback } from "react";
import { MaybeScroll } from "../internal/maybe-scroll.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet.tsx";
import { AddProjectForm } from "./add-project-form.tsx";
import { UpdateProjectForm } from "./update-project-form.tsx";

export interface IProjectFormSheetProps {
  orgId: string;
  project?: IProject;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitComplete?: (project?: IProject) => void;
}

export function ProjectFormSheet(props: IProjectFormSheetProps) {
  const { isOpen, onOpenChange, onSubmitComplete, project, orgId } = props;

  const handleSubmitComplete = useCallback(
    (project?: IProject) => {
      onOpenChange(false);
      onSubmitComplete?.(project);
    },
    [onOpenChange, onSubmitComplete]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max:w-[440px] p-0">
        <MaybeScroll className="h-[calc(100vh)]">
          <SheetHeader>
            <SheetTitle>
              {project ? "Update Project" : "New Project"}
            </SheetTitle>
            <SheetDescription>
              {project
                ? "Update the project to change the name or description."
                : "Create a new project to start adding logs."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 p-4">
            {project ? (
              <UpdateProjectForm
                project={project}
                onSubmitComplete={handleSubmitComplete}
              />
            ) : (
              <AddProjectForm
                onSubmitComplete={handleSubmitComplete}
                orgId={orgId}
              />
            )}
          </div>
        </MaybeScroll>
      </SheetContent>
    </Sheet>
  );
}

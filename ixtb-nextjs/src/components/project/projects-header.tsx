"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { Button } from "../ui/button";
import { ProjectFormSheet } from "./project-form-sheet";

export function ProjectsHeader(props: { className?: string; orgId: string }) {
  const [openForm, setOpenForm] = useState(false);
  const router = useRouter();

  return (
    <>
      <ProjectFormSheet
        isOpen={openForm}
        onOpenChange={setOpenForm}
        onSubmitComplete={(project) => {
          if (project) {
            router.push(
              kClientPaths.app.org.project.single(props.orgId, project.id)
            );
          }
        }}
        orgId={props.orgId}
      />
      <ComponentListHeader
        title="Projects"
        description="Manage your projects."
        button={
          <Button onClick={() => setOpenForm(true)} variant="outline">
            Create
            <PlusIcon className="w-4 h-4 ml-1" />
          </Button>
        }
        className={props.className}
      />
    </>
  );
}

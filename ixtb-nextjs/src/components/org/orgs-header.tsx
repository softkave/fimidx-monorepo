"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { Button } from "../ui/button";
import { OrgFormSheet } from "./org-form-sheet";

export function OrgsHeader(props: { className?: string }) {
  const [openForm, setOpenForm] = useState(false);
  const router = useRouter();

  return (
    <>
      <OrgFormSheet
        isOpen={openForm}
        onOpenChange={setOpenForm}
        onSubmitComplete={(org) => {
          if (org) {
            router.push(kClientPaths.app.org.single(org.id));
          }
        }}
      />
      <ComponentListHeader
        title="Organizations"
        description="Manage your organizations."
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

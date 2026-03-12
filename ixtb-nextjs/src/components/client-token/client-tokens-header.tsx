"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { Button } from "../ui/button";
import { ClientTokenFormSheet } from "./client-token-form-sheet";

export function ClientTokensHeader(props: {
  className?: string;
  orgId: string;
  projectId: string;
  title?: string;
  description?: string;
}) {
  const [openForm, setOpenForm] = useState(false);
  const router = useRouter();

  return (
    <>
      <ClientTokenFormSheet
        isOpen={openForm}
        onOpenChange={setOpenForm}
        onSubmitComplete={(clientToken) => {
          if (!clientToken) {
            return;
          }

          const orgId = clientToken.meta?.orgId;
          const projectId = clientToken.meta?.projectId;

          if (!orgId || !projectId) {
            return;
          }

          router.push(
            kClientPaths.app.org.project.clientToken.single(
              orgId,
              projectId,
              clientToken.id
            )
          );
        }}
        orgId={props.orgId}
        projectId={props.projectId}
      />
      <ComponentListHeader
        title={props.title ?? "Client Tokens"}
        description={props.description ?? "Manage your client tokens."}
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

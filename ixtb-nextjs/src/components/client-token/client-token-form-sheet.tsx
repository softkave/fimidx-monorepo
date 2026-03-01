"use client";

import { IClientToken } from "fimidx-core/definitions/clientToken";
import { useCallback } from "react";
import { MaybeScroll } from "../internal/maybe-scroll.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet.tsx";
import { AddClientTokenForm } from "./add-client-token-form.tsx";
import { UpdateClientTokenForm } from "./update-client-token-form.tsx";

export interface IClientTokenFormSheetProps {
  orgId: string;
  projectId: string;
  clientToken?: IClientToken;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitComplete?: (clientToken?: IClientToken) => void;
  addMessage?: string;
  updateMessage?: string;
  addTitle?: string;
  updateTitle?: string;
}

export function ClientTokenFormSheet(props: IClientTokenFormSheetProps) {
  const {
    isOpen,
    onOpenChange,
    onSubmitComplete,
    clientToken,
    orgId,
    projectId,
    addMessage = "Create a new client token to start adding logs.",
    updateMessage = "Update the client token to change the name or description.",
    addTitle = "New Client Token",
    updateTitle = "Update Client Token",
  } = props;

  const handleSubmitComplete = useCallback(
    (clientToken?: IClientToken) => {
      onOpenChange(false);
      onSubmitComplete?.(clientToken);
    },
    [onOpenChange, onSubmitComplete]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max:w-[440px] p-0">
        <MaybeScroll className="h-[calc(100vh)]">
          <SheetHeader>
            <SheetTitle>{clientToken ? updateTitle : addTitle}</SheetTitle>
            <SheetDescription>
              {clientToken ? updateMessage : addMessage}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 p-4">
            {clientToken ? (
              <UpdateClientTokenForm
                clientToken={clientToken}
                onSubmitComplete={handleSubmitComplete}
              />
            ) : (
              <AddClientTokenForm
                onSubmitComplete={handleSubmitComplete}
                orgId={orgId}
                projectId={projectId}
              />
            )}
          </div>
        </MaybeScroll>
      </SheetContent>
    </Sheet>
  );
}

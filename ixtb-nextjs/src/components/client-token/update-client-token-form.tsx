"use client";

import {
  UpdateClientTokensOnSuccessParams,
  useUpdateClientTokens,
} from "@/src/lib/clientApi/clientToken.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { IPermissionAtom } from "fimidx-core/definitions/permission";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form.tsx";
import { Input } from "../ui/input.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { PermissionSelector } from "./permission-selector";

export interface IUpdateClientTokenFormProps {
  clientToken: IClientToken;
  onSubmitComplete: (clientToken?: IClientToken) => void;
}

export const updateClientTokenFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export function UpdateClientTokenForm(props: IUpdateClientTokenFormProps) {
  const { clientToken, onSubmitComplete } = props;
  const [permissions, setPermissions] = useState<IPermissionAtom[]>(
    clientToken.permissions ?? []
  );

  const form = useForm<z.infer<typeof updateClientTokenFormSchema>>({
    resolver: zodResolver(updateClientTokenFormSchema),
    defaultValues: {
      name: clientToken.name,
      description: clientToken.description ?? "",
    },
  });

  const handleSuccess = useCallback(
    (...args: UpdateClientTokensOnSuccessParams) => {
      onSubmitComplete(undefined);
    },
    [onSubmitComplete]
  );

  const updateClientTokenHook = useUpdateClientTokens({
    onSuccess: handleSuccess,
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof updateClientTokenFormSchema>) => {
      const permissionsWithEntity = permissions.map((p) => ({
        ...p,
        entity: p.entity ?? "client-token",
      }));
      await updateClientTokenHook.trigger({
        query: {
          projectId: clientToken.projectId,
          groupId: clientToken.groupId,
          id: { eq: clientToken.id },
        },
        update: {
          name: values.name,
          description: values.description,
          permissions: permissionsWithEntity,
        },
      } as never);
    },
    [
      updateClientTokenHook,
      clientToken.id,
      clientToken.projectId,
      clientToken.groupId,
      permissions,
    ]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(evt) => {
          evt.stopPropagation();
          form.handleSubmit(onSubmit)(evt);
        }}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="my logs client token" {...field} />
              </FormControl>
              <FormDescription>
                What should this client token be called?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="my logs client token" {...field} />
              </FormControl>
              <FormDescription>
                What is this client token used for?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <PermissionSelector
          value={permissions}
          onChange={setPermissions}
          targetId={clientToken.projectId}
        />
        <Button type="submit" className="w-full">
          Update Client Token
        </Button>
      </form>
    </Form>
  );
}

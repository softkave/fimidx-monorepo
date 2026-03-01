"use client";

import {
  AddClientTokenOnSuccessParams,
  useAddClientToken,
} from "@/src/lib/clientApi/clientToken.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { IClientToken } from "fimidx-core/definitions/clientToken";
import { kId0 } from "fimidx-core/definitions/system";
import { useCallback } from "react";
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

export interface IAddClientTokenFormProps {
  orgId: string;
  projectId: string;
  onSubmitComplete: (clientToken: IClientToken) => void;
}

export const addClientTokenFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

function generateClientTokenName() {
  return `client-token-${Math.random().toString(36).substring(2, 15)}`;
}

export function AddClientTokenForm(props: IAddClientTokenFormProps) {
  const { projectId, orgId, onSubmitComplete } = props;

  const form = useForm<z.infer<typeof addClientTokenFormSchema>>({
    resolver: zodResolver(addClientTokenFormSchema),
    defaultValues: {
      name: generateClientTokenName(),
      description: "",
    },
  });

  const handleSuccess = useCallback(
    (...args: AddClientTokenOnSuccessParams) => {
      onSubmitComplete(args[1].clientToken);
    },
    [onSubmitComplete]
  );

  const addClientTokenHook = useAddClientToken({
    onSuccess: handleSuccess,
    projectId: projectId,
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof addClientTokenFormSchema>) => {
      await addClientTokenHook.trigger({
        projectId: kId0,
        groupId: kId0,
        name: values.name,
        description: values.description,
        meta: {
          projectId: projectId,
          orgId: orgId,
        },
      });
    },
    [addClientTokenHook, projectId, orgId]
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
        <Button type="submit" className="w-full">
          Create Client Token
        </Button>
      </form>
    </Form>
  );
}

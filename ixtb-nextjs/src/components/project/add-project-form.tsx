"use client";

import {
  AddProjectOnSuccessParams,
  useAddProject,
} from "@/src/lib/clientApi/project.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { IProject } from "fimidx-core/definitions/project";
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

export interface IAddProjectFormProps {
  orgId: string;
  onSubmitComplete: (project: IProject) => void;
}

export const addProjectFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export function AddProjectForm(props: IAddProjectFormProps) {
  const { orgId, onSubmitComplete } = props;

  const form = useForm<z.infer<typeof addProjectFormSchema>>({
    resolver: zodResolver(addProjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSuccess = useCallback(
    (...args: AddProjectOnSuccessParams) => {
      onSubmitComplete(args[1].project);
    },
    [onSubmitComplete]
  );

  const addProjectHook = useAddProject({
    onSuccess: handleSuccess,
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof addProjectFormSchema>) => {
      await addProjectHook.trigger({
        orgId: orgId,
        name: values.name,
        description: values.description,
      });
    },
    [addProjectHook, orgId]
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
                <Input placeholder="my logs project" {...field} />
              </FormControl>
              <FormDescription>
                What is the name of the project?
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
                <Textarea placeholder="my logs project" {...field} />
              </FormControl>
              <FormDescription>
                What is the description of the project?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Create Project
        </Button>
      </form>
    </Form>
  );
}

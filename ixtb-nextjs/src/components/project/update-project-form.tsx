"use client";

import {
  UpdateProjectOnSuccessParams,
  useUpdateProject,
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

export interface IUpdateProjectFormProps {
  project: IProject;
  onSubmitComplete: (project?: IProject) => void;
}

export const addProjectFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export function UpdateProjectForm(props: IUpdateProjectFormProps) {
  const { project, onSubmitComplete } = props;

  const form = useForm<z.infer<typeof addProjectFormSchema>>({
    resolver: zodResolver(addProjectFormSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  });

  const handleSuccess = useCallback(
    (...args: UpdateProjectOnSuccessParams) => {
      onSubmitComplete(undefined);
    },
    [onSubmitComplete]
  );

  const updateProjectHook = useUpdateProject({
    onSuccess: handleSuccess,
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof addProjectFormSchema>) => {
      await updateProjectHook.trigger({
        query: {
          orgId: project.orgId,
          id: {
            eq: project.id,
          },
        },
        update: {
          name: values.name,
          description: values.description,
        },
      });
    },
    [updateProjectHook, project.id, project.orgId]
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
          Update Project
        </Button>
      </form>
    </Form>
  );
}

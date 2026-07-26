"use client";

import { useUpdateSymbolicationConfig } from "@/src/lib/clientApi/sourceMaps";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LogFieldCombobox } from "../log/filter/log-field-combobox";
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

const symbolicationConfigFormSchema = z.object({
  fieldsToSymbolicate: z.array(z.string()),
  repoIdFields: z.array(z.string()),
  versionFields: z.array(z.string()),
});

type SymbolicationConfigFormValues = z.infer<
  typeof symbolicationConfigFormSchema
>;

export interface ISymbolicationConfigFormProps {
  projectId: string;
  config: {
    fieldsToSymbolicate: string[];
    repoIdFields: string[];
    versionFields: string[];
  } | null;
  onSaveComplete?: () => void;
}

export function SymbolicationConfigForm(props: ISymbolicationConfigFormProps) {
  const { projectId, config, onSaveComplete } = props;

  const form = useForm<SymbolicationConfigFormValues>({
    resolver: zodResolver(symbolicationConfigFormSchema),
    defaultValues: {
      fieldsToSymbolicate: config?.fieldsToSymbolicate ?? [],
      // config?.fieldsToSymbolicate ?? ["stack", "stackTrace"],
      repoIdFields: config?.repoIdFields ?? [],
      // repoIdFields: config?.repoIdFields ?? ["metadata.repo", "repo"],
      versionFields: config?.versionFields ?? [],
      // versionFields: config?.versionFields ?? ["metadata.version", "version"],
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        fieldsToSymbolicate: config.fieldsToSymbolicate,
        repoIdFields: config.repoIdFields,
        versionFields: config.versionFields,
      });
    }
  }, [config, form]);

  const handleSuccess = useCallback(() => {
    onSaveComplete?.();
  }, [onSaveComplete]);

  const updateConfigHook = useUpdateSymbolicationConfig({
    projectId,
    onSuccess: handleSuccess,
  });

  const onSubmit = useCallback(
    async (values: SymbolicationConfigFormValues) => {
      await updateConfigHook.trigger({
        projectId,
        fieldsToSymbolicate: values.fieldsToSymbolicate,
        repoIdFields: values.repoIdFields,
        versionFields: values.versionFields,
      });
    },
    [updateConfigHook, projectId]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(evt) => {
          evt.stopPropagation();
          form.handleSubmit(onSubmit)(evt);
        }}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="fieldsToSymbolicate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fields to symbolicate</FormLabel>
              <FormControl>
                <LogFieldCombobox
                  projectId={projectId}
                  multiple
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="stack, stackTrace…"
                  allowCustomValue
                />
              </FormControl>
              <FormDescription>
                Log field paths that contain stack traces to symbolicate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="repoIdFields"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repo ID fields (first present used)</FormLabel>
              <FormControl>
                <LogFieldCombobox
                  projectId={projectId}
                  multiple
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="metadata.repo, repo…"
                  allowCustomValue
                />
              </FormControl>
              <FormDescription>
                Field paths used to resolve the code repo identifier.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="versionFields"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Version fields (first present used)</FormLabel>
              <FormControl>
                <LogFieldCombobox
                  projectId={projectId}
                  multiple
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="metadata.version, version…"
                  allowCustomValue
                />
              </FormControl>
              <FormDescription>
                Field paths used to resolve the code version.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateConfigHook.isMutating}>
          {updateConfigHook.isMutating ? "Saving…" : "Save config"}
        </Button>
      </form>
    </Form>
  );
}

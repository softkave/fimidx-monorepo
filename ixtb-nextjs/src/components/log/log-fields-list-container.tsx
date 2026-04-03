"use client";

import { useGetLogFields } from "@/src/lib/clientApi/log";
import { ILogField } from "fimidx-core/definitions/log";
import { ComponentListMessage } from "../internal/component-list/component-list-message";
import { WrapLoader } from "../internal/wrap-loader";

export interface ILogFieldsListContainerProps {
  projectId: string;
  className?: string;
  children: (data: { fields: ILogField[] }) => React.ReactNode;
  /**
   * When true, still render children with fields=[] when there are no fields
   * (no empty state). Use for forms that allow custom values. Default false.
   */
  renderWhenEmpty?: boolean;
}

/**
 * Fetches log fields for a project and renders children with the result. Use in
 * logs filter and source maps config so both can share the same data source.
 */
export function LogFieldsListContainer({
  projectId,
  className,
  children,
  renderWhenEmpty = false,
}: ILogFieldsListContainerProps) {
  const getLogFieldsHook = useGetLogFields({ query: { projectId } });

  return (
    <WrapLoader
      isLoading={getLogFieldsHook.isLoading}
      error={getLogFieldsHook.error}
      data={getLogFieldsHook.data}
      render={(data) => {
        if (data.fields.length === 0 && !renderWhenEmpty) {
          return (
            <ComponentListMessage
              title="No log fields"
              message="Ingest logs to get started"
              className="flex flex-col max-w-lg mx-auto"
            />
          );
        }
        return (
          <div className={className}>{children({ fields: data.fields })}</div>
        );
      }}
    />
  );
}

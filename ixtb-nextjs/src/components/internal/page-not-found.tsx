import type { ReactNode } from "react";
import { ComponentListMessage } from "./component-list/component-list-message";
import { PageError } from "./error";

export function PageNotFound(props: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <ComponentListMessage
      title={props.title ?? "Not found"}
      message={
        props.message ??
        "This resource may have been deleted or you may not have access to it."
      }
      className={props.className}
    />
  );
}

export function renderNotFoundError(params: {
  error: unknown;
  notFoundMessage: string;
  title: string;
  description?: string;
}): ReactNode {
  const message = (params.error as Error | undefined)?.message;
  if (message === params.notFoundMessage) {
    return (
      <PageNotFound title={params.title} message={params.description} />
    );
  }

  return <PageError error={params.error} />;
}

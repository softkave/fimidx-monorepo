"use client";

import { useSearchParams } from "next/navigation";
import {
  DefaultErrorMessage,
  SupportEmailLink,
} from "./default-error-message";

enum AuthError {
  Configuration = "Configuration",
}

const errorMap = {
  [AuthError.Configuration]: (
    <p>
      There was a problem when trying to authenticate. Please contact us at{" "}
      <SupportEmailLink /> if this error persists. Unique error code:{" "}
      <code className="rounded-sm bg-slate-100 p-1 text-xs">Configuration</code>
    </p>
  ),
};

export function ErrorTypeMessage() {
  const search = useSearchParams();
  const error = search.get("error") as AuthError;

  return <>{errorMap[error] || <DefaultErrorMessage />}</>;
}

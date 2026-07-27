"use client";

import { cn } from "@/src/lib/utils";
import { RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { DefaultErrorMessage } from "./default-error-message";

export interface IErrorPageContentProps {
  title?: string;
  /** Body copy. Defaults to a generic "contact us" message. */
  message?: ReactNode;
  /** Next.js error digest, shown so users can quote it in a report. */
  digest?: string;
  /** Renders a retry button when provided (e.g. `reset` from `error.tsx`). */
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

/**
 * Full-page error card shared by the `/error` route and the Next.js route
 * boundaries, so every "something went wrong" screen looks the same.
 */
export function ErrorPageContent(props: IErrorPageContentProps) {
  const {
    title = "Something went wrong",
    message,
    digest,
    onRetry,
    retryText = "Try again",
    className,
  } = props;

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center p-6",
        className
      )}
    >
      <div className="flex max-w-sm flex-col gap-3">
        <h5 className="text-xl font-semibold tracking-tight">{title}</h5>
        <div className="text-sm text-muted-foreground">
          {message ?? <DefaultErrorMessage />}
        </div>
        {digest && (
          <p className="text-xs text-muted-foreground">
            Reference code:{" "}
            <code className="rounded-sm bg-muted px-1 py-0.5">{digest}</code>
          </p>
        )}
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="self-start">
            <RotateCcwIcon />
            {retryText}
          </Button>
        )}
      </div>
    </div>
  );
}

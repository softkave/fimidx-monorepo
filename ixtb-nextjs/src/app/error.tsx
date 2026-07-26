"use client";

import { UnexpectedErrorMessage } from "@/src/components/internal/default-error-message";
import { ErrorPageContent } from "@/src/components/internal/error-page-content.tsx";
import { ProjectHeader } from "@/src/components/internal/project-header";
import { logClientError } from "@/src/lib/common/log-client-error";
import { useEffect } from "react";

export interface IRouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level boundary for everything under the root layout. The layout (and so
 * the providers) stays mounted, so retrying re-renders just the failed segment.
 * In development Next.js still shows its error overlay on top of this.
 */
export default function RouteError(props: IRouteErrorProps) {
  const { error, reset } = props;

  useEffect(() => {
    logClientError({ error, source: "RouteError", digest: error.digest });
  }, [error]);

  return (
    <main className="flex h-screen flex-1 flex-col">
      <ProjectHeader />
      <ErrorPageContent
        message={
          process.env.NODE_ENV === "development" ? (
            error.message
          ) : (
            <UnexpectedErrorMessage />
          )
        }
        digest={error.digest}
        onRetry={reset}
      />
    </main>
  );
}

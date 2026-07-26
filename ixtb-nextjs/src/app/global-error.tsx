"use client";

import { UnexpectedErrorMessage } from "@/src/components/internal/default-error-message";
import { ErrorPageContent } from "@/src/components/internal/error-page-content.tsx";
import { logClientError } from "@/src/lib/common/log-client-error";
import { useEffect } from "react";
import "./globals.css";

export interface IGlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Last-resort boundary for failures in the root layout itself. It replaces the
 * root layout, so nothing here may depend on the app's providers (no sidebar,
 * no global state) and it must render its own html/body.
 */
export default function GlobalError(props: IGlobalErrorProps) {
  const { error, reset } = props;

  useEffect(() => {
    logClientError({ error, source: "GlobalError", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main className="flex min-h-screen flex-col">
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
      </body>
    </html>
  );
}

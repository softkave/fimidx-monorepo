import { DefaultErrorMessage } from "@/src/components/internal/default-error-message.tsx";
import { ErrorPageContent } from "@/src/components/internal/error-page-content.tsx";
import { ErrorTypeMessage } from "@/src/components/internal/error-type-message.tsx";
import { ProjectHeader } from "@/src/components/internal/project-header";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: "Something went wrong",
};

/**
 * Landing page for errors we redirect to, e.g. auth failures that carry their
 * reason in `?error=`. Render-time crashes are handled by `app/error.tsx`.
 */
export default function ErrorPage() {
  return (
    <main className="flex h-screen flex-1 flex-col">
      <ProjectHeader />
      <ErrorPageContent
        message={
          <Suspense fallback={<DefaultErrorMessage />}>
            <ErrorTypeMessage />
          </Suspense>
        }
      />
    </main>
  );
}

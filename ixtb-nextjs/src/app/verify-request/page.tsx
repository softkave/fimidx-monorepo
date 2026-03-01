import { ProjectHeader } from "@/src/components/internal/project-header";
import { VerifyRequestMessage } from "@/src/components/internal/verify-request-message.tsx";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: kAppConstants.name,
  description: "Verify Request",
};

export default function VerifyRequestPage() {
  return (
    <main className="flex flex-col h-screen flex-1">
      <ProjectHeader />
      <div className="flex h-screen w-full flex-col items-center justify-center flex-1">
        <a
          href="#"
          className="block max-w-sm bg-white p-6 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <h5 className="mb-2 flex flex-row items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Verify Request
          </h5>
          <Suspense
            fallback={
              <div className="font-normal text-gray-700 dark:text-gray-400">
                Hello.
              </div>
            }
          >
            <VerifyRequestMessage />
          </Suspense>
        </a>
      </div>
    </main>
  );
}

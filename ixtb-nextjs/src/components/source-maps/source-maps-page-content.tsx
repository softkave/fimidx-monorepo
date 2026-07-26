"use client";

import {
  useGetSymbolicationConfig,
  useGetSourceMapUploads,
} from "@/src/lib/clientApi/sourceMaps";
import { ProjectContainer } from "../project/project-container";
import { SymbolicationConfigForm } from "./symbolication-config-form";
import { SourceMapsUploadsList } from "./source-maps-uploads-list";

export function SourceMapsPageContent(props: {
  projectId: string;
  orgId: string;
}) {
  const { projectId, orgId } = props;

  const { data: configData } = useGetSymbolicationConfig(projectId);
  const { data: uploadsData } = useGetSourceMapUploads(projectId);

  const config = configData?.config ?? null;
  const uploads = uploadsData?.uploads ?? [];

  return (
    <ProjectContainer
      projectId={projectId}
      orgId={orgId}
      render={() => (
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold">Source Maps</h1>

          <section>
            <h2 className="text-lg font-medium mb-2">Symbolication config</h2>
            <SymbolicationConfigForm projectId={projectId} config={config} />
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Uploaded source maps</h2>
            <SourceMapsUploadsList uploads={uploads} />
          </section>

          <p className="text-sm text-muted-foreground">
            Use the upload source maps API or CLI to upload source maps.
            Configure which log fields to symbolicate and which fields contain
            repo and version above.
          </p>
        </div>
      )}
    />
  );
}

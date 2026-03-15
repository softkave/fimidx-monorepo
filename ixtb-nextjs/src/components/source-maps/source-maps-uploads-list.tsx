"use client";

import { ComponentListMessage } from "../internal/component-list/component-list-message";

export interface ISourceMapUploadItem {
  repoIdentifier: string;
  version: string;
  uploadedAt: string;
  isZip: boolean;
  unzippedFimidaraPath: string | null;
}

export interface ISourceMapsUploadsListProps {
  uploads: ISourceMapUploadItem[];
}

function SourceMapUploadItem(props: { item: ISourceMapUploadItem }) {
  const { item } = props;
  return (
    <li className="text-sm">
      {item.repoIdentifier} @ {item.version} —{" "}
      {new Date(item.uploadedAt).toLocaleString()}
      {item.isZip && !item.unzippedFimidaraPath && (
        <span className="text-amber-600 ml-1">(unzip pending)</span>
      )}
    </li>
  );
}

export function SourceMapsUploadsListEmpty() {
  return (
    <ComponentListMessage
      title="No source maps uploaded yet"
      message="Use the upload API or CLI to upload source maps for this project."
    />
  );
}

export function SourceMapsUploadsList(props: ISourceMapsUploadsListProps) {
  const { uploads } = props;

  if (uploads.length === 0) {
    return <SourceMapsUploadsListEmpty />;
  }

  return (
    <ul className="list-disc list-inside space-y-1">
      {uploads.map((u, i) => (
        <SourceMapUploadItem key={i} item={u} />
      ))}
    </ul>
  );
}

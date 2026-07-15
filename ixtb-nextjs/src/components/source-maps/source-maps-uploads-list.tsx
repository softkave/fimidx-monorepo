"use client";

import { ComponentListMessage } from "../internal/component-list/component-list-message";

export interface ISourceMapUploadItem {
  repoIdentifier: string;
  version: string;
  repoIdentifierDisplay: string;
  versionDisplay: string;
  uploadedAt: string;
  isZip: boolean;
}

export interface ISourceMapsUploadsListProps {
  uploads: ISourceMapUploadItem[];
}

function SourceMapUploadItem(props: { item: ISourceMapUploadItem }) {
  const { item } = props;
  return (
    <li className="text-sm">
      {item.repoIdentifierDisplay} @ {item.versionDisplay} —{" "}
      {new Date(item.uploadedAt).toLocaleString()}
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

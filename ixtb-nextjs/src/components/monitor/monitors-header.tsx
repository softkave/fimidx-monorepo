"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ComponentListHeader } from "../internal/component-list/component-list-header";
import { Button } from "../ui/button";

export function MonitorsHeader(props: {
  className?: string;
  orgId: string;
  projectId: string;
}) {
  return (
    <ComponentListHeader
      title="Monitoring"
      description="Create monitors that alert you when matching logs appear."
      button={
        <Button variant="outline" asChild>
          <Link
            href={kClientPaths.app.org.project.monitors.new(
              props.orgId,
              props.projectId
            )}
          >
            Create
            <PlusIcon className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      }
      className={props.className}
    />
  );
}

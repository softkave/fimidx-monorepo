"use client";

import { cn } from "@/src/lib/utils";
import { objRecordQueryItemOpSchema } from "fimidx-core/definitions/obj";
import { XIcon } from "lucide-react";
import { Button } from "../../ui/button";
import { IWorkingLogPartFilterItem } from "./types";
import { normalizeStringArrayValue } from "./filter-value-utils";

const kOps = objRecordQueryItemOpSchema.Values;

const kChipOpLabels: Record<keyof typeof kOps, string> = {
  [kOps.eq]: "is",
  [kOps.neq]: "is not",
  [kOps.gt]: "greater than",
  [kOps.gte]: "at least",
  [kOps.lt]: "less than",
  [kOps.lte]: "at most",
  [kOps.like]: "contains",
  [kOps.in]: "is any of",
  [kOps.not_in]: "is not any of",
  [kOps.between]: "between",
  [kOps.exists]: "exists",
};

function formatChipValue(filter: IWorkingLogPartFilterItem): string {
  const { op, value } = filter.item;

  switch (op) {
    case kOps.in:
    case kOps.not_in: {
      const values = normalizeStringArrayValue(value);
      if (values.length === 0) {
        return "no values";
      }
      if (values.length === 1) {
        return values[0];
      }
      return `${values.length} values`;
    }
    case kOps.between: {
      const [start, end] = value as [string, string];
      return `${start} – ${end}`;
    }
    default:
      return String(value ?? "");
  }
}

function formatChipField(filter: IWorkingLogPartFilterItem): string {
  const path = filter.item.field;
  if (!path) {
    return "Field";
  }

  const segments = path.split(".");
  return segments[segments.length - 1] || path;
}

export interface ILogsFilterChipProps {
  filter: IWorkingLogPartFilterItem;
  onEdit: () => void;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

export function LogsFilterChip({
  filter,
  onEdit,
  onRemove,
  disabled,
  className,
}: ILogsFilterChipProps) {
  const op = filter.item.op as keyof typeof kOps;
  const opLabel = kChipOpLabels[op] ?? op;
  const valueLabel = formatChipValue(filter);
  const fieldLabel = formatChipField(filter);

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-stretch overflow-hidden rounded-lg border bg-muted/20 text-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="inline-flex min-w-0 max-w-full items-stretch disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="border-r px-2 py-1.5 font-medium">{fieldLabel}</span>
        <span className="border-r px-2 py-1.5 text-muted-foreground">
          {opLabel}
        </span>
        <span className="truncate px-2 py-1.5">{valueLabel}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className="h-auto w-8 shrink-0 rounded-none border-l"
        aria-label={`Remove ${fieldLabel} filter`}
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

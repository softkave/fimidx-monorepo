import assert from "assert";
import { useGetLogFieldsByPaths } from "@/src/lib/clientApi/log";
import { ILogField } from "fimidx-core/definitions/log";
import {
  IObjRecordQueryItem,
  IObjRecordQueryList,
} from "fimidx-core/definitions/obj";
import { Loader2, PlusIcon, XIcon } from "lucide-react";
import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../../ui/button";
import { LogsFilterChip } from "./logs-filter-chip";
import { normalizeValueForOp, normalizeStringArrayValue } from "./filter-value-utils";
import { LogsFilterItem } from "./logs-filter-item";
import { IWorkingLogPartFilterItem } from "./types";

export interface ILogsFilterListProps {
  orgId: string;
  projectId: string;
  onChange: (filters: IObjRecordQueryList) => void;
  filters?: IObjRecordQueryList;
  applyButtonText?: string;
  applyButtonClassName?: string;
  applyButtonVariant?: ComponentProps<typeof Button>["variant"];
  applyButtonType?: ComponentProps<typeof Button>["type"];
  applyButtonDisabled?: boolean;
  applyButtonLoading?: boolean;
  disabled?: boolean;
  hijackApplyButtonOnClick?: () => void;
  /**
   * Report filter changes to `onChange` as they happen and hide the apply
   * button. Use when the filters feed a surrounding form (e.g. monitor form)
   * that has its own submit, so there is no separate apply step to forget.
   */
  autoApply?: boolean;
}

const emptyDraft = (): IWorkingLogPartFilterItem => ({
  item: { field: "", op: "like", value: "" },
});

function toWorkingFilters(
  filters: IObjRecordQueryList | undefined,
  fieldsMap: Map<string, ILogField>
): IWorkingLogPartFilterItem[] {
  return (
    filters?.map((filter) => ({
      item: {
        field: filter.field,
        op: filter.op,
        value: normalizeValueForOp(filter.op, filter.value) as any,
      },
      field: fieldsMap.get(filter.field),
    })) ?? []
  );
}

function validateFilter(
  filter: IWorkingLogPartFilterItem
): IWorkingLogPartFilterItem {
  const normalizedFilter: IWorkingLogPartFilterItem = {
    ...filter,
    item: {
      ...filter.item,
      value: normalizeValueForOp(filter.item.op, filter.item.value) as never,
    },
  };
  const isNumberField = normalizedFilter.field?.type === "number";

  switch (normalizedFilter.item.op) {
    case "eq":
    case "neq": {
      const raw = normalizedFilter.item.value;
      if (raw === "" || raw === undefined || raw === null) {
        return {
          ...normalizedFilter,
          error: "Value is required",
        };
      }

      if (isNumberField) {
        const value = Number(raw);
        if (isNaN(value)) {
          return {
            ...normalizedFilter,
            error: "Invalid number value",
          };
        }
      }

      return {
        ...normalizedFilter,
        error: undefined,
      };
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (normalizedFilter.item.value === "") {
        return {
          ...normalizedFilter,
          error: "Value is required",
        };
      }

      assert.ok(normalizedFilter.item.value);
      const value = Number(normalizedFilter.item.value);
      if (isNaN(value)) {
        return {
          ...normalizedFilter,
          error: "Invalid value",
        };
      }

      return {
        ...normalizedFilter,
        error: undefined,
      };
    }
    case "like":
      if (normalizedFilter.item.value === "") {
        return {
          ...normalizedFilter,
          error: "Value is required",
        };
      }
      return {
        ...normalizedFilter,
        error: undefined,
      };
    case "in":
    case "not_in": {
      const values = normalizeStringArrayValue(normalizedFilter.item.value);
      if (values.length === 0) {
        return {
          ...normalizedFilter,
          item: { ...normalizedFilter.item, value: values as never },
          error: "At least one value is required",
        };
      }

      if (isNumberField) {
        for (const v of values) {
          if (isNaN(Number(v))) {
            return {
              ...normalizedFilter,
              item: { ...normalizedFilter.item, value: values as never },
              error: `Invalid number value: "${v}"`,
            };
          }
        }
      }

      return {
        ...normalizedFilter,
        item: { ...normalizedFilter.item, value: values as never },
        error: undefined,
      };
    }
    case "between": {
      if (!Array.isArray(normalizedFilter.item.value) || normalizedFilter.item.value.length !== 2) {
        return {
          ...normalizedFilter,
          error: "Both values are required",
        };
      }

      const [v1, v2] = normalizedFilter.item.value as [string, string];
      const value1 = Number(v1);
      if (isNaN(value1)) {
        return {
          ...normalizedFilter,
          error: "First value is invalid",
        };
      }

      const value2 = Number(v2);
      if (isNaN(value2)) {
        return {
          ...normalizedFilter,
          error: "Second value is invalid",
        };
      }

      return {
        ...normalizedFilter,
        error: undefined,
      };
    }
    default:
      return {
        ...normalizedFilter,
        error: undefined,
      };
  }
}

function isFilterReady(filter: IWorkingLogPartFilterItem): boolean {
  if (!filter.item.field || !filter.item.op) {
    return false;
  }

  return !validateFilter(filter).error;
}

function transformFilterValue(
  filter: IWorkingLogPartFilterItem
): IObjRecordQueryItem["value"] {
  const isNumberField = filter.field?.type === "number";

  if (!isNumberField) {
    return filter.item.value;
  }

  switch (filter.item.op) {
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return Number(filter.item.value);
    case "in":
    case "not_in":
      return (filter.item.value as string[]).map(Number);
    case "between":
      return (filter.item.value as [string, string]).map(Number) as [
        number,
        number
      ];
    default:
      return filter.item.value;
  }
}

function workingFilterToFilter(
  filter: IWorkingLogPartFilterItem
): IObjRecordQueryItem {
  assert.ok(filter.item.field, "Field is required");
  assert.ok(filter.item.op, "Op is required");
  // Empty string / false / 0 are valid values; only nullish is missing.
  assert.ok(
    filter.item.value !== undefined && filter.item.value !== null,
    "Value is required"
  );
  return {
    field: filter.item.field,
    op: filter.item.op,
    value: transformFilterValue(filter) as any,
  };
}

function transformFilters(
  filters: IWorkingLogPartFilterItem[]
): IObjRecordQueryItem[] {
  return filters.map(workingFilterToFilter);
}

function isSameFilterList(
  a: IObjRecordQueryList | undefined,
  b: IObjRecordQueryList | undefined
): boolean {
  if (a === b) return true;
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

export function LogsFilterList(props: ILogsFilterListProps) {
  const {
    orgId,
    projectId,
    onChange,
    filters: initialFilters,
    applyButtonText,
    applyButtonClassName,
    applyButtonVariant,
    applyButtonType = "button",
    applyButtonDisabled,
    applyButtonLoading,
    disabled,
    hijackApplyButtonOnClick,
    autoApply = false,
  } = props;

  // Tracks what we last reported so the echo back through `filters` does not
  // reset in-progress edits.
  const lastEmittedRef = useRef<IObjRecordQueryList>(initialFilters ?? []);

  const emitFilters = useCallback(
    (next: IObjRecordQueryList) => {
      lastEmittedRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  const selectedPaths = useMemo(() => {
    const paths: string[] = [];
    for (const filter of initialFilters ?? []) {
      if (filter.field?.trim()) {
        paths.push(filter.field);
      }
    }
    return paths;
  }, [initialFilters]);

  const { fields: resolvedFields, isLoading: isLoadingSelectedFields } =
    useGetLogFieldsByPaths({
      projectId,
      paths: selectedPaths,
    });

  const fieldsMap = useMemo(() => {
    return new Map(resolvedFields.map((f) => [f.path, f]));
  }, [resolvedFields]);

  const [appliedFilters, setAppliedFilters] = useState<
    IWorkingLogPartFilterItem[]
  >(() => toWorkingFilters(initialFilters, fieldsMap));

  const [draftFilter, setDraftFilter] =
    useState<IWorkingLogPartFilterItem | null>(null);

  useEffect(() => {
    const incoming = initialFilters ?? [];
    if (isSameFilterList(incoming, lastEmittedRef.current)) {
      return;
    }
    lastEmittedRef.current = incoming;
    setAppliedFilters(toWorkingFilters(initialFilters, fieldsMap));
    setDraftFilter(null);
  }, [initialFilters, fieldsMap]);

  useEffect(() => {
    // Field types decide how values are coerced (e.g. numeric in/not_in), so
    // wait for the selected-field lookup before reporting anything.
    if (!autoApply || isLoadingSelectedFields) {
      return;
    }

    const validatedDraft = draftFilter ? validateFilter(draftFilter) : null;
    const ready = [
      ...appliedFilters.filter(isFilterReady),
      ...(validatedDraft && isFilterReady(validatedDraft)
        ? [validatedDraft]
        : []),
    ];
    const next = transformFilters(ready);
    if (isSameFilterList(next, lastEmittedRef.current)) {
      return;
    }
    emitFilters(next);
  }, [
    autoApply,
    isLoadingSelectedFields,
    appliedFilters,
    draftFilter,
    emitFilters,
  ]);

  // Enrich metadata when selected-field lookup resolves, without wiping drafts.
  useEffect(() => {
    setAppliedFilters((prev) =>
      prev.map((filter) => ({
        ...filter,
        field: filter.field ?? fieldsMap.get(filter.item.field),
      })),
    );
    setDraftFilter((prev) =>
      prev
        ? {
            ...prev,
            field: prev.field ?? fieldsMap.get(prev.item.field),
          }
        : null,
    );
  }, [fieldsMap]);

  const hasAppliedFilters = appliedFilters.length > 0;
  const hasDraftFilter = draftFilter != null;
  const canApply =
    hasAppliedFilters ||
    (hasDraftFilter && isFilterReady(validateFilter(draftFilter)));

  const commitDraftIfReady = (
    currentApplied: IWorkingLogPartFilterItem[],
    draft: IWorkingLogPartFilterItem | null
  ): {
    applied: IWorkingLogPartFilterItem[];
    draft: IWorkingLogPartFilterItem | null;
    committed: boolean;
  } => {
    if (!draft) {
      return { applied: currentApplied, draft: null, committed: false };
    }

    const validated = validateFilter(draft);
    if (!isFilterReady(validated)) {
      setDraftFilter(validated);
      return { applied: currentApplied, draft: validated, committed: false };
    }

    return {
      applied: [...currentApplied, validated],
      draft: null,
      committed: true,
    };
  };

  const handleDraftChange = (value: IWorkingLogPartFilterItem) => {
    setDraftFilter(value);
  };

  const handleRemoveDraft = () => {
    setDraftFilter(null);
  };

  const handleAddFilter = () => {
    if (draftFilter) {
      const { applied, draft, committed } = commitDraftIfReady(
        appliedFilters,
        draftFilter
      );
      setAppliedFilters(applied);
      setDraftFilter(committed ? emptyDraft() : draft);
      return;
    }

    setDraftFilter(emptyDraft());
  };

  const handleEditChip = (index: number) => {
    const chipToEdit = appliedFilters[index];

    setAppliedFilters((prev) => {
      let next = prev.filter((_, i) => i !== index);
      if (draftFilter) {
        const validated = validateFilter(draftFilter);
        if (isFilterReady(validated)) {
          next = [...next, validated];
        }
      }
      return next;
    });

    setDraftFilter(chipToEdit);
  };

  const handleRemoveChip = (index: number) => {
    setAppliedFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyFilters = () => {
    let nextApplied = appliedFilters;

    if (draftFilter) {
      const validated = validateFilter(draftFilter);
      if (!isFilterReady(validated)) {
        setDraftFilter(validated);
        return;
      }
      nextApplied = [...nextApplied, validated];
      setAppliedFilters(nextApplied);
      setDraftFilter(null);
    }

    emitFilters(transformFilters(nextApplied));
  };

  const handleClearFilters = () => {
    setAppliedFilters([]);
    setDraftFilter(null);
    emitFilters([]);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2">
        {appliedFilters.map((filter, index) => (
          <LogsFilterChip
            key={`${filter.item.field}-${filter.item.op}-${index}`}
            filter={filter}
            onEdit={() => handleEditChip(index)}
            onRemove={() => handleRemoveChip(index)}
            disabled={disabled}
          />
        ))}
      </div>

      {draftFilter && (
        <div className="w-full max-w-lg mx-auto">
          <LogsFilterItem
            item={draftFilter}
            onChange={handleDraftChange}
            onRemove={handleRemoveDraft}
            fieldsMap={fieldsMap}
            projectId={projectId}
            disabled={disabled}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={(!hasAppliedFilters && !hasDraftFilter) || disabled}
            className="w-full"
            type="button"
          >
            <XIcon className="h-4 w-4" />
            Clear filters
          </Button>
          <Button
            variant="outline"
            onClick={handleAddFilter}
            className="w-full"
            disabled={disabled}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            {hasDraftFilter ? "Add another filter" : "Add filter"}
          </Button>
        </div>
        {!autoApply && (
          <Button
            onClick={() => {
              if (hijackApplyButtonOnClick) {
                hijackApplyButtonOnClick();
              } else {
                handleApplyFilters();
              }
            }}
            disabled={applyButtonDisabled || !canApply || applyButtonLoading}
            className={applyButtonClassName}
            variant={applyButtonVariant}
            type={applyButtonType}
          >
            {applyButtonLoading && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {applyButtonText ?? "Apply filters"}
          </Button>
        )}
      </div>
    </div>
  );
}

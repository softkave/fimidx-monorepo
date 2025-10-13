import assert from "assert";
import { ILogField } from "fimidx-core/definitions/log";
import {
  IObjPartQueryItem,
  IObjPartQueryList,
} from "fimidx-core/definitions/obj";
import { Loader2, PlusIcon, XIcon } from "lucide-react";
import { ComponentProps, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { LogsFilterItem } from "./logs-filter-item";
import { IWorkingLogPartFilterItem } from "./types";

export interface ILogsFilterListProps {
  orgId: string;
  appId: string;
  onChange: (filters: IObjPartQueryList) => void;
  filters?: IObjPartQueryList;
  fields: ILogField[];
  applyButtonText?: string;
  applyButtonClassName?: string;
  applyButtonVariant?: ComponentProps<typeof Button>["variant"];
  applyButtonType?: ComponentProps<typeof Button>["type"];
  applyButtonDisabled?: boolean;
  applyButtonLoading?: boolean;
  disabled?: boolean;
  hijackApplyButtonOnClick?: () => void;
}

function validateFilter(
  filter: IWorkingLogPartFilterItem
): IWorkingLogPartFilterItem {
  switch (filter.item.op) {
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (filter.item.value === "") {
        return {
          ...filter,
          error: "Value is required",
        };
      }

      assert.ok(filter.item.value);
      const value = Number(filter.item.value);
      if (isNaN(value)) {
        return {
          ...filter,
          error: "Invalid value",
        };
      }

      return {
        ...filter,
        error: undefined,
      };
    }
    case "like":
      if (filter.item.value === "") {
        return {
          ...filter,
          error: "Value is required",
        };
      }
      return {
        ...filter,
        error: undefined,
      };
    case "in":
    case "not_in":
      if (filter.item.value.length === 0) {
        return {
          ...filter,
          error: "At least one value is required",
        };
      }
      return {
        ...filter,
        error: undefined,
      };
    case "between":
      if (filter.item.value.length !== 2) {
        return {
          ...filter,
          error: "Both values are required",
        };
      }

      assert.ok(filter.item.value);
      const value1 = Number(filter.item.value);
      if (isNaN(value1)) {
        return {
          ...filter,
          error: "First value is invalid",
        };
      }

      const value2 = Number(filter.item.value);
      if (isNaN(value2)) {
        return {
          ...filter,
          error: "Second value is invalid",
        };
      }

      return {
        ...filter,
        error: undefined,
      };
    default:
      return {
        ...filter,
        error: undefined,
      };
  }
}

function workingFilterToFilter(
  filter: IWorkingLogPartFilterItem
): IObjPartQueryItem {
  assert.ok(filter.item.field, "Field is required");
  assert.ok(filter.item.op, "Op is required");
  assert.ok(filter.item.value, "Value is required");
  return {
    field: filter.item.field,
    op: filter.item.op,
    value: filter.item.value as any,
  };
}

export function LogsFilterList(props: ILogsFilterListProps) {
  const {
    orgId,
    appId,
    onChange,
    filters: initialFilters,
    fields,
    applyButtonText,
    applyButtonClassName,
    applyButtonVariant,
    applyButtonType,
    applyButtonDisabled,
    applyButtonLoading,
    disabled,
    hijackApplyButtonOnClick,
  } = props;
  const [filters, setFilters] = useState<IWorkingLogPartFilterItem[]>(
    initialFilters?.map((filter) => ({
      item: {
        field: filter.field,
        op: filter.op,
        value: filter.value as any,
      },
    })) ?? []
  );

  const hasFilters = useMemo(() => {
    return filters.length > 0;
  }, [filters]);

  const handleChange = (item: IWorkingLogPartFilterItem, index: number) => {
    const newFilters = [...filters];
    newFilters[index] = item;
    setFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    const newFilters = filters.map(validateFilter);
    setFilters(newFilters);

    const hasErrors = newFilters.some((filter) => filter.error);
    if (hasErrors) {
      return;
    }

    onChange(newFilters.map(workingFilterToFilter));
  };

  const itemsNode = filters.map((filter, index) => {
    return (
      <LogsFilterItem
        key={filter.item.field}
        item={filter}
        onChange={(value) => handleChange(value, index)}
        onRemove={() => handleRemoveFilter(index)}
        orgId={orgId}
        appId={appId}
        fields={fields}
        disabled={disabled}
      />
    );
  });

  const handleAddFilter = () => {
    setFilters((prev) => [
      ...prev,
      { item: { field: "", op: "eq", value: "" } },
    ]);
  };

  const handleClearFilters = () => {
    setFilters([]);
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {itemsNode}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={!hasFilters || disabled}
            className="w-full"
          >
            <XIcon className="h-4 w-4" />
            Clear filters
          </Button>
          <Button
            variant="outline"
            onClick={handleAddFilter}
            className="w-full"
            disabled={disabled}
          >
            <PlusIcon className="h-4 w-4" />
            Add filter
          </Button>
        </div>
        <Button
          onClick={() => {
            if (hijackApplyButtonOnClick) {
              hijackApplyButtonOnClick();
            } else {
              handleApplyFilters();
            }
          }}
          disabled={applyButtonDisabled || !hasFilters || applyButtonLoading}
          className={applyButtonClassName}
          variant={applyButtonVariant}
          type={applyButtonType}
        >
          {applyButtonLoading && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {applyButtonText ?? "Apply filters"}
        </Button>
      </div>
    </div>
  );
}

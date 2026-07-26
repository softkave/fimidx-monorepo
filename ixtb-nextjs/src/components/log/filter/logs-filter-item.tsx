import { FieldType } from "fimidx-core/common/indexer";
import { ILogField } from "fimidx-core/definitions/log";
import { objRecordQueryItemOpSchema } from "fimidx-core/definitions/obj";
import { XIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { BetweenNumberOrDateInput } from "./between-number-or-date-input";
import {
  getDefaultOpForField,
  getDefaultValueForOp,
  normalizeStringArrayValue,
} from "./filter-value-utils";
import { InInput, InValueChips } from "./in-input";
import { LogFieldCombobox } from "./log-field-combobox";
import { NumberOrDateInput } from "./number-or-date-input";
import { IWorkingLogPartFilterItem } from "./types";

const kOps = objRecordQueryItemOpSchema.Values;
const kAllOps = objRecordQueryItemOpSchema.options;
const kOpLabels: Record<keyof typeof kOps, string> = {
  [kOps.eq]: "Equal to",
  [kOps.neq]: "Not equal to",
  [kOps.gt]: "Greater than",
  [kOps.gte]: "Greater than or equal to",
  [kOps.lt]: "Less than",
  [kOps.lte]: "Less than or equal to",
  [kOps.like]: "Like",
  [kOps.in]: "In",
  [kOps.not_in]: "Not in",
  [kOps.between]: "Between",
  [kOps.exists]: "Exists",
};

const kValueTypeToAllowedOps: Record<FieldType, (keyof typeof kOps)[]> = {
  string: [kOps.eq, kOps.neq, kOps.like, kOps.in, kOps.not_in],
  number: [
    kOps.eq,
    kOps.neq,
    kOps.gt,
    kOps.gte,
    kOps.lt,
    kOps.lte,
    kOps.between,
  ],
  boolean: [kOps.eq, kOps.neq],
  null: [kOps.eq, kOps.neq],
  undefined: [kOps.eq, kOps.neq],
};

export interface ILogsFilterItemProps {
  item: IWorkingLogPartFilterItem;
  projectId: string;
  fieldsMap: Map<string, ILogField>;
  onChange: (value: IWorkingLogPartFilterItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function LogsFilterItem(props: ILogsFilterItemProps) {
  const { projectId, fieldsMap, item, onChange, onRemove, disabled } = props;

  const knownField = item.field ?? fieldsMap.get(item.item.field);

  const ops = useMemo(() => {
    if (knownField) {
      return kValueTypeToAllowedOps[knownField.type];
    }
    if (item.item.field) {
      return kAllOps;
    }
    return [];
  }, [knownField, item.item.field]);

  const renderSelectName = () => {
    return (
      <LogFieldCombobox
        projectId={projectId}
        value={item.item.field}
        onChange={(value, selectedField) => {
          const field = selectedField ?? fieldsMap.get(value);
          const fieldChanged = value !== item.item.field;
          const allowedOps = field
            ? kValueTypeToAllowedOps[field.type]
            : kAllOps;
          const defaultOp = getDefaultOpForField(field);

          let nextOp = item.item.op;
          let nextValue = item.item.value;

          if (fieldChanged) {
            if (!allowedOps.includes(item.item.op)) {
              nextOp = defaultOp;
              nextValue = getDefaultValueForOp(defaultOp) as never;
            } else if (item.item.op === kOps.eq && defaultOp === kOps.like) {
              nextOp = kOps.like;
              nextValue = getDefaultValueForOp(kOps.like) as never;
            }
          }

          onChange({
            ...item,
            item: {
              ...item.item,
              field: value,
              op: nextOp,
              value: nextValue,
            } as typeof item.item,
            field,
          });
        }}
        disabled={disabled}
        placeholder="Field"
        allowCustomValue
      />
    );
  };

  const renderSelectOp = () => {
    return (
      <Select
        value={item.item.op}
        onValueChange={(value) => {
          onChange({
            ...item,
            item: {
              ...item.item,
              // @ts-expect-error
              op: value,
              value: getDefaultValueForOp(
                value as (typeof kOps)[keyof typeof kOps]
              ) as never,
            },
          });
        }}
        disabled={!item.item.field || disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {ops.map((op) => (
            <SelectItem key={op} value={op}>
              <span className="text-sm font-medium">{kOpLabels[op]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderInNotInValue = () => {
    const values = normalizeStringArrayValue(item.item.value);

    const handleValuesChange = (value: string[]) => {
      onChange({
        ...item,
        item: {
          ...item.item,
          value: value as never,
        },
      });
    };

    return (
      <InInput
        value={values}
        onChange={handleValuesChange}
        disabled={disabled}
      />
    );
  };

  const renderInNotInValueChips = () => {
    const values = normalizeStringArrayValue(item.item.value);

    return (
      <InValueChips
        value={values}
        onChange={(value) =>
          onChange({
            ...item,
            item: {
              ...item.item,
              value: value as never,
            },
          })
        }
        disabled={disabled}
      />
    );
  };

  const renderSelectValue = () => {
    if (!item.item.field) {
      return null;
    }

    switch (item.item.op) {
      case kOps.in:
      case kOps.not_in:
        return renderInNotInValue();
      case kOps.between:
        return (
          <BetweenNumberOrDateInput
            value={item.item.value as any}
            onChange={(value) =>
              onChange({
                ...item,
                item: { ...item.item, value: value as any },
              })
            }
            fieldName={item.item.field}
            disabled={disabled}
          />
        );
      case kOps.like:
      case kOps.eq:
      case kOps.neq:
        return (
          <Textarea
            value={item.item.value as any}
            onChange={(e) =>
              onChange({
                ...item,
                item: { ...item.item, value: e.target.value as any },
              })
            }
            disabled={disabled}
          />
        );
      case kOps.gt:
      case kOps.gte:
      case kOps.lt:
      case kOps.lte:
        return (
          <NumberOrDateInput
            value={item.item.value as any}
            onChange={(value) =>
              onChange({
                ...item,
                item: { ...item.item, value: value as any },
              })
            }
            fieldName={item.item.field}
            disabled={disabled}
          />
        );
      default:
        return null;
    }
  };

  const renderDeleteButton = () => {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        type="button"
      >
        <XIcon className="h-4 w-4" />
      </Button>
    );
  };

  const renderError = () => {
    if (!item.error) {
      return null;
    }

    return <div className="text-red-500">{item.error}</div>;
  };

  const render = () => {
    switch (item.item.op) {
      case kOps.between:
      case kOps.like:
      case kOps.eq:
      case kOps.neq:
      case kOps.gt:
      case kOps.gte:
      case kOps.lt:
      case kOps.lte:
        return (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <div className="min-w-0">{renderSelectName()}</div>
              <div>{renderSelectOp()}</div>
              <div>{renderDeleteButton()}</div>
            </div>
            {renderSelectValue()}
            {renderError()}
          </div>
        );
      case kOps.not_in:
      case kOps.in:
      default:
        return (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2">
              <div className="min-w-0">{renderSelectName()}</div>
              <div>{renderSelectOp()}</div>
              <div className="min-w-0">{renderSelectValue()}</div>
              <div>{renderDeleteButton()}</div>
            </div>
            {renderInNotInValueChips()}
            {renderError()}
          </div>
        );
    }
  };

  return render();
}

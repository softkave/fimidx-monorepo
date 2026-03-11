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
import { InInput } from "./in-input";
import { NumberOrDateInput } from "./number-or-date-input";
import { IWorkingLogPartFilterItem } from "./types";

const kOps = objRecordQueryItemOpSchema.Values;
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
  orgId: string;
  projectId: string;
  item: IWorkingLogPartFilterItem;
  fields: ILogField[];
  onChange: (value: IWorkingLogPartFilterItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function LogsFilterItem(props: ILogsFilterItemProps) {
  const { fields, item, onChange, onRemove, projectId, disabled } = props;

  const field = useMemo(() => {
    return fields.find((f) => f.path === item.item.field);
  }, [fields, item.item.field]);

  const ops = useMemo(() => {
    return field ? kValueTypeToAllowedOps[field.type] : [];
  }, [field]);

  const renderSelectName = () => {
    return (
      <Select
        value={item.item.field}
        onValueChange={(value) => {
          onChange({
            ...item,
            item: { ...item.item, field: value },
          });
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[180px] w-full">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields?.map((field) => (
            <SelectItem key={field.id} value={field.path}>
              <pre>
                <code>{field.path}</code>
              </pre>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
            },
          });
        }}
        disabled={!field || disabled}
      >
        <SelectTrigger className="w-[180px] w-full">
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

  const renderSelectValue = () => {
    if (!item.item.field) {
      return null;
    }

    switch (item.item.op) {
      case kOps.in:
      case kOps.not_in:
        return (
          <InInput
            value={item.item.value as string[]}
            onChange={(value) =>
              onChange({
                ...item,
                item: {
                  ...item.item,
                  value: value as any,
                },
              })
            }
            disabled={disabled}
          />
        );
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
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 overflow-hidden">
              <div>{renderSelectName()}</div>
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
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 overflow-hidden">
              <div>{renderSelectName()}</div>
              <div>{renderSelectOp()}</div>
              <div className="overflow-hidden">{renderSelectValue()}</div>
              <div>{renderDeleteButton()}</div>
            </div>
            {renderError()}
          </div>
        );
    }
  };

  return render();
}

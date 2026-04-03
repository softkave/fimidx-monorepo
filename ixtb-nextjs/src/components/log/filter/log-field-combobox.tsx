"use client";

import { cn } from "@/src/lib/utils";
import { ILogField } from "fimidx-core/definitions/log";
import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "../../ui/combobox";

const defaultPlaceholder = {
  single: "Field",
  multiple: "Add field…",
};

interface LogFieldComboboxPropsBase {
  fields: ILogField[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Allow entering field paths not in the list (custom/freeform) */
  allowCustomValue?: boolean;
}

export type LogFieldComboboxProps =
  | (LogFieldComboboxPropsBase & {
      multiple?: false;
      value: string;
      onChange: (value: string) => void;
    })
  | (LogFieldComboboxPropsBase & {
      multiple: true;
      value: string[];
      onChange: (value: string[]) => void;
    });

/**
 * Combobox for choosing log field path(s). When multiple is true,
 * value/onChange are array-based; otherwise single string. When
 * allowCustomValue is true, the current input is shown as an option when it
 * doesn't match any field.
 */
export function LogFieldCombobox(props: LogFieldComboboxProps) {
  const {
    fields,
    disabled,
    placeholder,
    className,
    allowCustomValue = true,
  } = props;

  const anchorRef = useComboboxAnchor();
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(() => {
    const paths = fields.map((f) => f.path);
    if (
      allowCustomValue &&
      inputValue.trim() &&
      !paths.includes(inputValue.trim())
    ) {
      return [...paths, inputValue.trim()];
    }
    return paths;
  }, [fields, inputValue, allowCustomValue]);

  const isMultiple = props.multiple === true;
  const place =
    placeholder ?? defaultPlaceholder[isMultiple ? "multiple" : "single"];

  if (isMultiple) {
    const { value, onChange } = props;
    return (
      <Combobox
        multiple
        value={value}
        onValueChange={(v) => onChange(v ?? [])}
        onInputValueChange={(v) => setInputValue(v)}
        disabled={disabled}
      >
        <div
          ref={anchorRef}
          className={cn(
            "min-h-9 min-w-[200px] flex-1 rounded-md border border-input",
            className
          )}
        >
          <ComboboxChips className="w-full">
            {value.map((path) => (
              <ComboboxChip key={path}>
                <code className="text-xs">{path}</code>
              </ComboboxChip>
            ))}
            <ComboboxChipsInput placeholder={place} />
          </ComboboxChips>
        </div>
        <ComboboxContent anchor={anchorRef}>
          <ComboboxList>
            {options.map((path) => (
              <ComboboxItem key={path} value={path}>
                <pre className="overflow-hidden text-ellipsis">
                  <code className="text-sm">{path}</code>
                </pre>
              </ComboboxItem>
            ))}
            <ComboboxEmpty>No fields</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
  }

  const { value, onChange } = props;
  return (
    <Combobox
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      onInputValueChange={(v) => setInputValue(v)}
      disabled={disabled}
    >
      <div
        ref={anchorRef}
        className={cn("w-[180px] min-w-0 flex-1", className)}
      >
        <ComboboxInput
          placeholder={place}
          showTrigger
          showClear={!!value}
          className="w-full"
        />
      </div>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxList>
          {options.map((path) => (
            <ComboboxItem key={path} value={path}>
              <pre className="overflow-hidden text-ellipsis">
                <code className="text-sm">{path}</code>
              </pre>
            </ComboboxItem>
          ))}
          <ComboboxEmpty>No fields</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

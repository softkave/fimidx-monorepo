import { cn } from "@/src/lib/utils";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { normalizeStringArrayValue } from "./filter-value-utils";

export function InInput(props: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { onChange, disabled } = props;
  const value = normalizeStringArrayValue(props.value);
  const [inputValue, setInputValue] = useState<string>("");

  const addValue = () => {
    if (disabled) {
      return;
    }

    const nextValue = inputValue.trim();
    if (nextValue && !value.includes(nextValue)) {
      onChange([...value, nextValue]);
      setInputValue("");
    }
  };

  return (
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addValue();
        }
      }}
      placeholder="Type a value and press Enter"
      disabled={disabled}
    />
  );
}

export function InValueChips(props: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { onChange, disabled } = props;
  const value = normalizeStringArrayValue(props.value);

  if (value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((option) => (
        <span
          key={option}
          className="inline-flex max-w-full items-center gap-1 rounded-lg border bg-muted/50 px-2 text-md pr-0"
        >
          <span className="truncate">{option}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className={cn("shrink-0 opacity-50 hover:opacity-100 size-6")}
            aria-label={`Remove ${option}`}
            onClick={() => {
              if (disabled) {
                return;
              }

              onChange(value.filter((o) => o !== option));
            }}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </span>
      ))}
    </div>
  );
}

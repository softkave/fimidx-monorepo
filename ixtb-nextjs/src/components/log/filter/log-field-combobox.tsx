"use client";

import { useGetLogFieldsInfinite } from "@/src/lib/clientApi/log";
import { cn } from "@/src/lib/utils";
import { ILogField } from "fimidx-core/definitions/log";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_LIMIT = 50;

interface LogFieldComboboxPropsBase {
  projectId: string;
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
      onChange: (value: string, field?: ILogField) => void;
    })
  | (LogFieldComboboxPropsBase & {
      multiple: true;
      value: string[];
      onChange: (value: string[]) => void;
    });

/**
 * Combobox for choosing log field path(s). Fetches fields for `projectId` with
 * infinite scroll and server-side path search as the user types.
 */
export function LogFieldCombobox(props: LogFieldComboboxProps) {
  const {
    projectId,
    disabled,
    placeholder,
    className,
    allowCustomValue = true,
  } = props;

  const anchorRef = useComboboxAnchor();
  const [inputValue, setInputValue] = useState("");
  const [debouncedPath, setDebouncedPath] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedPath(inputValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [inputValue]);

  const {
    fields: fetchedFields,
    hasMore,
    isLoading,
    isLoadingMore,
    setSize,
  } = useGetLogFieldsInfinite({
    projectId,
    path: debouncedPath || undefined,
    limit: PAGE_LIMIT,
  });

  useEffect(() => {
    setSize(1);
  }, [debouncedPath, projectId, setSize]);

  const fieldsByPath = useMemo(() => {
    const map = new Map<string, ILogField>();
    for (const field of fetchedFields) {
      map.set(field.path, field);
    }
    return map;
  }, [fetchedFields]);

  const options = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    // Prefer server results; also filter client-side so stale pages / in-flight
    // debounce never show non-matching paths. Deduplicate by path so React
    // keys stay unique even if the API returns overlapping rows.
    const seen = new Set<string>();
    const paths: string[] = [];
    for (const field of fetchedFields) {
      if (seen.has(field.path)) {
        continue;
      }
      if (query && !field.path.toLowerCase().includes(query)) {
        continue;
      }
      seen.add(field.path);
      paths.push(field.path);
    }
    if (
      allowCustomValue &&
      query &&
      !paths.some((path) => path.toLowerCase() === query)
    ) {
      paths.push(inputValue.trim());
    }
    return paths;
  }, [fetchedFields, inputValue, allowCustomValue]);

  const isMultiple = props.multiple === true;
  const place =
    placeholder ?? defaultPlaceholder[isMultiple ? "multiple" : "single"];

  const loadMoreIfNeeded = (el: HTMLElement) => {
    if (!hasMore || isLoadingMore) {
      return;
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      setSize((size) => size + 1);
    }
  };

  const renderItem = (path: string) => (
    <ComboboxItem key={path} value={path}>
      <pre className="overflow-hidden text-ellipsis">
        <code className="text-sm text-wrap">{path}</code>
      </pre>
    </ComboboxItem>
  );

  const renderList = () => (
    <>
      <ComboboxEmpty>
        {isLoading ? "Loading fields…" : "No fields"}
      </ComboboxEmpty>
      <ComboboxList
        onScroll={(event) => loadMoreIfNeeded(event.currentTarget)}
      >
        {renderItem}
      </ComboboxList>
      {isLoadingMore ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </>
  );

  if (isMultiple) {
    const { value, onChange } = props;
    return (
      <Combobox
        items={options}
        filter={null}
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
        <ComboboxContent anchor={anchorRef}>{renderList()}</ComboboxContent>
      </Combobox>
    );
  }

  const { value, onChange } = props;

  const commitValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === value) {
      return;
    }
    if (!allowCustomValue && !fieldsByPath.has(trimmed)) {
      return;
    }
    onChange(trimmed, fieldsByPath.get(trimmed));
  };

  return (
    <Combobox
      items={options}
      filter={null}
      value={value}
      onValueChange={(v) => {
        const next = v ?? "";
        onChange(next, fieldsByPath.get(next));
      }}
      onInputValueChange={(v) => setInputValue(v)}
      disabled={disabled}
    >
      <div ref={anchorRef} className={cn("w-full min-w-0 flex-1", className)}>
        <ComboboxInput
          placeholder={place}
          showTrigger
          showClear={!!value}
          className="w-full"
          onBlur={() => commitValue(inputValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitValue(inputValue);
            }
          }}
        />
      </div>
      <ComboboxContent anchor={anchorRef}>{renderList()}</ComboboxContent>
    </Combobox>
  );
}

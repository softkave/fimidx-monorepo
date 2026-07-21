"use client";

import { useGetOrgMembers } from "@/src/lib/clientApi/org";
import { Fragment, useMemo } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "../ui/combobox";

type UserOption = {
  value: string;
  label: string;
};

export interface IMonitorReportsToUsersComboboxProps {
  orgId: string;
  value: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function MonitorReportsToUsersCombobox(
  props: IMonitorReportsToUsersComboboxProps
) {
  const { orgId, value, onChange, disabled } = props;
  const anchor = useComboboxAnchor();
  const { data, isLoading } = useGetOrgMembers({ orgId });

  const options = useMemo<UserOption[]>(() => {
    const members = data?.members ?? [];
    const fromApi = members.map((m) => ({
      value: m.userId,
      label: m.email ? `${m.name} (${m.email})` : m.name,
    }));

    // Keep previously selected users visible even if they left the org list.
    const known = new Set(fromApi.map((o) => o.value));
    for (const userId of value) {
      if (!known.has(userId)) {
        fromApi.push({ value: userId, label: userId });
      }
    }
    return fromApi;
  }, [data?.members, value]);

  const selected = useMemo(
    () =>
      value
        .map((userId) => options.find((o) => o.value === userId))
        .filter((o): o is UserOption => o != null),
    [options, value]
  );

  return (
    <Combobox
      items={options}
      multiple
      value={selected}
      onValueChange={(next) =>
        onChange((next ?? []).map((item) => item.value))
      }
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled || isLoading}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values: UserOption[]) => (
            <Fragment>
              {values.map((item) => (
                <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={
                  isLoading
                    ? "Loading members…"
                    : values.length > 0
                      ? "Add user…"
                      : "Select users to notify…"
                }
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>
          {isLoading ? "Loading members…" : "No members found."}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: UserOption) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="truncate">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

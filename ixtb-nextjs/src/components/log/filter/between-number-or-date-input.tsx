import { CalendarIcon, HashIcon } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip";
import { BetweenInputDate } from "./between-input-date";
import { BetweenInputNumber } from "./between-input-number";

export function BetweenNumberOrDateInput(props: {
  value: string[];
  onChange: (value: string[]) => void;
  fieldName: string;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;
  const [type, setType] = useState<"date" | "number">("number");

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 w-full">
      <ToggleGroup
        onValueChange={(value) => {
          setType((value[0] as "date" | "number" | undefined) ?? "number");
        }}
        variant="outline"
        value={[type]}
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <ToggleGroupItem value="number" aria-label="Number">
                <HashIcon className="h-4 w-4" />
              </ToggleGroupItem>
            }
          />
          <TooltipContent>Number</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <ToggleGroupItem value="date" aria-label="Date">
                <CalendarIcon className="h-4 w-4" />
              </ToggleGroupItem>
            }
          />
          <TooltipContent>Date</TooltipContent>
        </Tooltip>
      </ToggleGroup>
      {type === "number" ? (
        <BetweenInputNumber
          value={value}
          onChange={onChange}
          fieldName={props.fieldName}
          disabled={disabled}
        />
      ) : (
        <BetweenInputDate
          value={value}
          onChange={onChange}
          fieldName={props.fieldName}
          disabled={disabled}
        />
      )}
    </div>
  );
}

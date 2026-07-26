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
        type="single"
        onValueChange={(value) => {
          setType(value as "date" | "number");
        }}
        variant="outline"
        value={type}
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="number" aria-label="Number">
              <HashIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>Number</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="date" aria-label="Date">
              <CalendarIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
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

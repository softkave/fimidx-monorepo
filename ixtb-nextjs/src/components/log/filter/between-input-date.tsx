import { cn } from "@/src/lib/utils";
import { format, parse } from "date-fns";
import { CalendarIcon, MinusIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { TimePicker } from "./time-picker";

export function BetweenInputDate(props: {
  value: string[];
  onChange: (value: string[]) => void;
  fieldName: string;
  className?: string;
  disabled?: boolean;
}) {
  const { value, onChange, className, disabled } = props;
  const date: DateRange | undefined = {
    from: value[0] ? new Date(Number(value[0])) : undefined,
    to: value[1] ? new Date(Number(value[1])) : undefined,
  };

  const setDate = (date: DateRange | undefined) => {
    onChange([
      date?.from?.getTime().toString() ?? "",
      date?.to?.getTime().toString() ?? "",
    ]);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            type="button"
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y HH:mm:ss")} -{" "}
                  {format(date.to, "LLL dd, y HH:mm:ss")}
                </>
              ) : (
                format(date.from, "LLL dd, y HH:mm:ss")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-2">
            <TimePicker
              value={date?.from ? format(date.from, "HH:mm:ss") : ""}
              onChange={(value) => {
                const intermediateValue = parse(
                  value,
                  "HH:mm:ss",
                  date?.from ?? new Date()
                );

                setDate({
                  from: intermediateValue,
                  to: date?.to,
                });
              }}
              disabled={!date?.from}
            />
            <div className="flex items-center justify-center">
              <MinusIcon className="h-4 w-4" />
            </div>
            <TimePicker
              value={date?.to ? format(date.to, "HH:mm:ss") : ""}
              onChange={(value) => {
                const intermediateValue = parse(
                  value,
                  "HH:mm:ss",
                  date?.to ?? new Date()
                );

                setDate({
                  from: date?.from,
                  to: intermediateValue,
                });
              }}
              disabled={!date?.to}
            />
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

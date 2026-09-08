"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";
import { useCallback, useMemo } from "react";

export interface IDatePickerProps {
  date?: string | Date | null;
  setDate: (date: string | undefined) => void;
  className?: string;
}

export function DatePicker(props: IDatePickerProps) {
  const { date, setDate, className } = props;
  const dateValue = useMemo(() => {
    if (typeof date === "string") {
      return new Date(date);
    }

    return date;
  }, [date]);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        setDate(date.toISOString());
      } else {
        setDate(undefined);
      }
    },
    [setDate]
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              className,
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={dateValue ?? undefined}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

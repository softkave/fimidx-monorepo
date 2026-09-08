"use client";

import { cn } from "@/src/lib/utils";
import { Ellipsis, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface ILogsHeaderMenuProps {
  isMutating?: boolean;
  onShowFiltersAndSort: (showFiltersAndSort: boolean) => void;
  showFiltersAndSort?: boolean;
}

export function LogsHeaderMenu(props: ILogsHeaderMenuProps) {
  const { isMutating, onShowFiltersAndSort, showFiltersAndSort } = props;

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              disabled={isMutating}
              className={cn(isMutating && "animate-pulse")}
            >
              {isMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ellipsis className="w-4 h-4" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => onShowFiltersAndSort(!showFiltersAndSort)}
          >
            {showFiltersAndSort ? "Hide Filters" : "Show Filters"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

import { cn } from "@/src/lib/utils";
import { cva } from "class-variance-authority";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const errorVariants = cva("py-4 px-4 w-full", {
  variants: {
    variant: {
      default: "",
      secondary:
        "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 rounded-md",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function PageError(props: {
  error: unknown;
  className?: string;
  variant?: "default" | "secondary";
  showTitle?: boolean;
  errorTextClassName?: string;
  wrapInTooltip?: boolean;
}) {
  const showTitle = props.showTitle ?? true;
  const message =
    (props.error as Error | undefined)?.message || "An error occurred";
  let messageNode = (
    <p
      className={cn(
        "text-muted-foreground text-center",
        props.errorTextClassName
      )}
    >
      {message}
    </p>
  );

  if (props.wrapInTooltip) {
    messageNode = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={messageNode} />
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(errorVariants({ variant: props.variant }), props.className)}
    >
      {showTitle && <h3 className="font-medium text-lg text-center">Error</h3>}
      {messageNode}
    </div>
  );
}

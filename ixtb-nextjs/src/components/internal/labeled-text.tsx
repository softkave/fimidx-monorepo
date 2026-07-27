import { cn } from "@/src/lib/utils.ts";

export interface ILabeledTextProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export function LabeledText({
  label,
  children,
  className,
  labelClassName,
}: ILabeledTextProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "text-md font-semibold text-muted-foreground",
          labelClassName
        )}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

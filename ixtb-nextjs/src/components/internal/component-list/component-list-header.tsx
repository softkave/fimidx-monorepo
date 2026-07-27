import { cn } from "@/src/lib/utils";

export function ComponentListHeader(props: {
  title: string;
  description?: string;
  button?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center gap-2 py-4 px-4 w-full",
        props.className
      )}
    >
      <div className="flex flex-col gap-1 flex-1 min-h-[36px] justify-center">
        <h1 className="text-xl font-semibold">{props.title}</h1>
        {props.description && (
          <p className="text-muted-foreground text-sm">{props.description}</p>
        )}
      </div>
      {props.button}
    </div>
  );
}

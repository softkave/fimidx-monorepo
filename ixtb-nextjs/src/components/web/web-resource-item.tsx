import { cn } from "@/src/lib/utils";
import { CornerUpRightIcon } from "lucide-react";
import Link from "next/link";

export function WebResourceItem(props: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={props.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex flex-col gap-2 p-4 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors",
        props.className
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {props.icon}
      </div>
      <h3 className="text-md font-semibold flex items-center gap-2">
        <span>{props.title}</span>
        <CornerUpRightIcon className="w-3 h-3 text-muted-foreground" />
      </h3>
      <p className="text-sm text-muted-foreground">{props.description}</p>
    </Link>
  );
}

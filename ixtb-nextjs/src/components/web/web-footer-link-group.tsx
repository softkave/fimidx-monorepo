import { cn } from "@/src/lib/utils";
import { CornerUpRightIcon } from "lucide-react";
import Link from "next/link";

export interface IWebFooterLinkGroup {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
}

export const kFooterLinkGroups: IWebFooterLinkGroup[] = [
  {
    title: "Other Products",
    links: [
      { label: "fimidara", href: "https://fimidara.com" },
      { label: "fimipost", href: "https://fimipost.ywordk.com" },
      { label: "mmind", href: "https://mmind.ywordk.com" },
      { label: "card game", href: "https://kder.ywordk.com" },
    ],
  },
];

export function WebFooterLinkGroup(props: {
  group: IWebFooterLinkGroup;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">
        {props.group.title}
      </h3>
      <ul className="flex flex-col gap-2">
        {props.group.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm flex items-center gap-2"
            >
              <span>{link.label}</span>
              <CornerUpRightIcon className="w-3 h-3" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { cn } from "@/src/lib/utils";
import { FileTextIcon, PackageIcon, PlugIcon } from "lucide-react";
import { GithubIcon } from "../icons/github";
import { WebResourceItem } from "./web-resource-item";

export interface IWebResource {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

export const kResourceListItems: IWebResource[] = [
  {
    title: "fimidx",
    description:
      "JavaScript SDK and CLI. Buffered log shipping, plus source map uploads for readable stack traces.",
    href: "https://www.npmjs.com/package/fimidx",
    icon: <PackageIcon />,
  },
  {
    title: "fimidx-winston-transport",
    description:
      "Drain an existing Winston logger to fimidx without changing your logging code.",
    href: "https://www.npmjs.com/package/fimidx-winston-transport",
    icon: <PlugIcon />,
  },
  {
    title: "fimidx-log-files-consumer",
    description:
      "Tail log files already on disk and ship new lines to fimidx. No code changes needed.",
    href: "https://www.npmjs.com/package/fimidx-log-files-consumer",
    icon: <FileTextIcon />,
  },
  {
    title: "Source on GitHub",
    description: "The full monorepo: server, UI, SDKs, and packages.",
    href: "https://github.com/softkave/fimidx-monorepo",
    icon: <GithubIcon className="w-6 h-6" />,
  },
];

export function WebResourceList(props: {
  items: IWebResource[];
  className?: string;
}) {
  return (
    <div className={cn("w-full", props.className)}>
      <div className="flex flex-col gap-4 md:max-w-4xl mx-auto">
        <h2 className="text-lg md:text-2xl font-semibold">Packages & source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.items.map((item) => (
            <WebResourceItem key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

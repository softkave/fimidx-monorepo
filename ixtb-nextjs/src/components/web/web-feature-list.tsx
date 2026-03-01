import { cn } from "@/src/lib/utils";
import { LogsIcon } from "lucide-react";
import { WebFeatureItem } from "./web-feature-item";

export interface IWebFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const kFeatureListItems: IWebFeature[] = [
  {
    title: "Logs",
    description: "View your project logs.",
    icon: <LogsIcon />,
  },
];

export function WebFeatureList(props: {
  items: IWebFeature[];
  className?: string;
}) {
  return (
    <div className={cn("w-full", props.className)}>
      <div className="flex flex-col gap-4 md:max-w-4xl mx-auto">
        <h2 className="text-lg md:text-2xl font-bold">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.items.map((item) => (
            <WebFeatureItem key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

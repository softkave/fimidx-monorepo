import { cn } from "@/src/lib/utils";
import { BellIcon, LogsIcon, ActivityIcon } from "lucide-react";
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
  {
    title: "Monitoring",
    description: "Track conditions across your logs in real time.",
    icon: <ActivityIcon />,
  },
  {
    title: "Alerting",
    description: "Get notified when monitors detect issues.",
    icon: <BellIcon />,
  },
];

export function WebFeatureList(props: {
  items: IWebFeature[];
  className?: string;
}) {
  return (
    <div className={cn("w-full", props.className)}>
      <div className="flex flex-col gap-4 md:max-w-4xl mx-auto">
        <h2 className="text-lg md:text-2xl font-semibold">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.items.map((item) => (
            <WebFeatureItem key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

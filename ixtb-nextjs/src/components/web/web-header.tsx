import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import Link from "next/link";
import { Button } from "../ui/button";
import { kAppConstants } from "fimidx-core/definitions/appConstants";

export function WebHeader(props: { className?: string }) {
  return (
    <div className={cn("w-full", props.className)}>
      <div className="flex justify-between items-center gap-4 max-w-4xl mx-auto w-full">
        <h1 className="text-lg md:text-xl font-black flex-1">
          <Link href={kClientPaths.withURL(kClientPaths.index)}>
            {kAppConstants.name}
          </Link>
        </h1>
        <div className="flex justify-end">
          <Link href={kClientPaths.withURL(kClientPaths.signin)}>
            <Button variant="outline">Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { cn } from "@/src/lib/utils";
import { kAppConstants } from "fimidx-core/definitions/appConstants";
import Link from "next/link";
import { Button } from "../ui/button";

export function WebLanding(props: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-12", props.className)}>
      <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full gap-6 md:gap-8">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            {kAppConstants.name}
          </h1>
          <p className="text-md md:text-xl text-center font-semibold text-muted-foreground w-full">
            {kAppConstants.description}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <Link href={kClientPaths.withURL(kClientPaths.signin)}>
            <Button variant="default">Get Started</Button>
          </Link>
        </div>
      </div>
      {/* <div className="flex flex-col items-center justify-center">
        <img
          src="https://api.fimidara.com/v1/files/readFile/softkave/public/ChoreBuddy-landing.png"
          alt="ChoreBuddy"
          className="w-full h-full object-cover rounded-lg shadow-lg max-w-4xl border-2 border-gray-200"
        />
      </div> */}
    </div>
  );
}

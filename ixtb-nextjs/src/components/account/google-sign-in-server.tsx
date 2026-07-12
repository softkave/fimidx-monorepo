"use client";

import { authClient } from "@/src/lib/auth-client";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths.ts";
import { cn } from "@/src/lib/utils.ts";
import { Button } from "../ui/button.tsx";

export interface IGoogleSignInServerProps {
  redirectTo?: string;
  className?: string;
  buttonClassName?: string;
}

export default function GoogleSignInServer({
  redirectTo,
  className,
  buttonClassName,
}: IGoogleSignInServerProps) {
  return (
    <form
      action={async () => {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: kClientPaths.withURL(
            redirectTo ?? kClientPaths.app.index,
          ),
        });
      }}
      className={cn("w-full", className)}
    >
      <Button
        type="submit"
        variant="outline"
        className={cn("w-full", buttonClassName)}
      >
        Sign-in with Google
      </Button>
    </form>
  );
}

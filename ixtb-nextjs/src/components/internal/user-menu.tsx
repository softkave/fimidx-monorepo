"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths.ts";
import { useProjectSession } from "@/src/lib/clientHooks/userHooks.ts";
import { UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

export function UserMenu() {
  const router = useRouter();
  const { status } = useProjectSession();

  if (status !== "authenticated") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* <DropdownMenuItem
          onSelect={() => {
            router.push(kClientPaths.project.profile);
          }}
        >
          Profile
        </DropdownMenuItem> */}
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            router.push(kClientPaths.index);
          }}
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

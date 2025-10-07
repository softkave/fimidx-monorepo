import { signIn } from "@/auth";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export interface IEmailSignInServerProps {
  redirectTo?: string;
}

export function EmailSignInServer(props: IEmailSignInServerProps) {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("resend", {
          email: formData.get("email"),
          redirectTo: kClientPaths.withURL(
            props.redirectTo ?? kClientPaths.app.index
          ),
        });
      }}
      className="space-y-8"
    >
      <div className="grid gap-2">
        <label htmlFor="email">Email</label>
        <Input
          placeholder="Email"
          name="email"
          type="email"
          id="email"
          required
        />
        <p className="text-muted-foreground text-sm">
          Enter your email to sign in. A magic link will be sent to your email.
        </p>
      </div>
      <Button type="submit" className="w-full" variant="outline">
        Sign-in with Email
      </Button>
    </form>
  );
}

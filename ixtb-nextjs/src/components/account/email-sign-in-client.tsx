"use client";

import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form.tsx";
import { Input } from "../ui/input.tsx";

export interface IEmailSignInClientProps {
  redirectTo?: string;
}

const emailSignInFormSchema = z.object({
  email: z.string().email(),
});

export function EmailSignInClient(props: IEmailSignInClientProps) {
  const searchParams = useSearchParams();
  const redirectTo =
    props.redirectTo ??
    searchParams.get("redirectTo") ??
    kClientPaths.app.index;

  const form = useForm<z.infer<typeof emailSignInFormSchema>>({
    resolver: zodResolver(emailSignInFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof emailSignInFormSchema>) => {
      await signIn("resend", {
        email: values.email,
        redirectTo: kClientPaths.withURL(redirectTo),
      });
    },
    [redirectTo]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(evt) => {
          evt.stopPropagation();
          form.handleSubmit(onSubmit)(evt);
        }}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Email"
                  id="email-resend"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter your email to sign in. A magic link will be sent to your
                email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" variant="default">
          <MailIcon className="w-4 h-4" />
          <span className="flex-1">Sign-in with Email</span>
        </Button>
      </form>
    </Form>
  );
}

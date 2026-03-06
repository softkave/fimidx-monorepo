import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import { authDb } from "fimidx-core/db/auth-schema";
import { checkIsAdminEmail } from "fimidx-core/serverHelpers/isAdmin";
import NextAuth, { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { NextRequest } from "next/server";
import { ixtbNextAuthLogger } from "./src/lib/common/ixtb-loggers";
import { sendVerificationRequestEmail } from "./src/lib/serverHelpers/emails/sendVerificationRequestEmail";

const { resend } = getCoreConfig();

const e2eCredentialsProvider = Credentials({
  id: "credentials-e2e",
  name: "E2E Test Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = process.env.E2E_TEST_USER_EMAIL;
    const password = process.env.E2E_TEST_USER_PASSWORD;
    if (!email || !password) return null;
    if (
      credentials?.email === email &&
      credentials?.password === password
    ) {
      const id = process.env.E2E_TEST_USER_ID ?? email;
      return { id, email, name: "E2E Test User" };
    }
    return null;
  },
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: ixtbNextAuthLogger,
  providers: [
    Google,
    e2eCredentialsProvider,
    Resend({
      from: resend.fromEmail,
      async sendVerificationRequest({ identifier: email, url }) {
        await sendVerificationRequestEmail({
          to: email,
          url,
        });
      },
    }),
  ],
  adapter: DrizzleAdapter(authDb),
  // debug: true,
  callbacks: {
    session: async ({ session, user }) => {
      const isAdmin = checkIsAdminEmail(user.email);
      return {
        expires: session.expires,
        user: {
          isAdmin,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          id: session.user.id,
        },
      };
    },
  },
  pages: {
    error: "/error",
    verifyRequest: "/verify-request",
  },
});

export interface NextAuthRequest extends NextRequest {
  auth: Session | null;
}

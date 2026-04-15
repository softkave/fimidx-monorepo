import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import { authDb } from "fimidx-core/db/auth.sqlite";
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
    if (credentials?.email === email && credentials?.password === password) {
      const id = process.env.E2E_TEST_USER_ID ?? email;
      return { id, email, name: "E2E Test User" };
    }
    return null;
  },
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: ixtbNextAuthLogger,
  // debug: true, E2E runs with `.env.test` and a Turso-backed adapter may be
  // unavailable in CI/dev DNS environments. Using JWT sessions keeps auth
  // working without relying on the adapter for session persistence.
  session: {
    strategy: process.env.E2E_TEST_USER_EMAIL ? "jwt" : "database",
  },
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
  callbacks: {
    jwt: async ({ token, user }) => {
      // Persist id/email into the token for JWT sessions.
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
      }
      return token;
    },
    session: async ({ session, user, token }) => {
      const email = user?.email ?? token?.email ?? session.user?.email;
      const id =
        (user as any)?.id ?? (token as any)?.id ?? (session.user as any)?.id;
      if (!email || !id) return session;
      const isAdmin = checkIsAdminEmail(email);
      return {
        expires: session.expires,
        user: {
          isAdmin,
          email,
          id,
          name: session.user.name,
          image: session.user.image,
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

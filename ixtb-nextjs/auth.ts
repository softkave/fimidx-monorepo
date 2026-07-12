import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { betterAuth } from "better-auth/minimal";
import { customSession, magicLink } from "better-auth/plugins";
import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import { getMongoConnection } from "fimidx-core/db/fimidx.mongo";
import { checkIsAdminEmail } from "fimidx-core/serverHelpers/isAdmin";
import { headers } from "next/headers";
import { sendVerificationRequestEmail } from "./src/lib/serverHelpers/emails/sendVerificationRequestEmail";

const { mongo, betterAuth: betterAuthConfig } = getCoreConfig();
const baseURL = betterAuthConfig.url;
const secret = betterAuthConfig.secret;

const { connection } = getMongoConnection();
const client = connection.getClient();
const db = client.db(mongo.dbName);

export const authApi = betterAuth({
  secret,
  baseURL,
  database: mongodbAdapter(db, { client }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    customSession(async ({ user, session }: { user: any; session: any }) => ({
      user: {
        ...user,
        isAdmin: checkIsAdminEmail(user.email),
      },
      session,
    })),
    magicLink({
      async sendMagicLink({ email, url }: { email: string; url: string }) {
        await sendVerificationRequestEmail({
          to: email,
          url,
        });
      },
    }),
  ],
});

export async function auth() {
  return authApi.api.getSession({ headers: await headers() });
}

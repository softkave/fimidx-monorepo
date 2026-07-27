import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { betterAuth } from "better-auth/minimal";
import { customSession, magicLink } from "better-auth/plugins";
import { getCoreConfig } from "fimidx-core/common/getCoreConfig";
import { getMongoConnection } from "fimidx-core/db/fimidx.mongo";
import { checkIsAdminEmail } from "fimidx-core/serverHelpers/isAdmin";
import { headers } from "next/headers";
import { sendVerificationRequestEmail } from "./src/lib/serverHelpers/emails/sendVerificationRequestEmail";

function createAuthApi() {
  const { mongo, betterAuth: betterAuthConfig } = getCoreConfig();
  const { connection } = getMongoConnection();
  const client = connection.getClient();
  const db = client.db(mongo.dbName);

  return betterAuth({
    secret: betterAuthConfig.secret,
    baseURL: betterAuthConfig.url,
    database: mongodbAdapter(db, { client }),
    // Better Auth maps Mongo `_id` → `user.id` (ObjectId hex). That hex string is
    // the canonical user id across the app (session userId, member meta.userId,
    // monitor reportsTo). User lookups resolve by `_id`; see fimidx-core user.ts.
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    plugins: [
      customSession(async ({ user, session }: { user: any; session: any }) => {
        return {
          user: {
            ...user,
            isAdmin: checkIsAdminEmail(user.email),
          },
          session,
        };
      }),
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
}

type AuthApi = ReturnType<typeof createAuthApi>;

let authApiInstance: AuthApi | undefined;

function getAuthApi(): AuthApi {
  if (!authApiInstance) {
    authApiInstance = createAuthApi();
  }
  return authApiInstance;
}

/** Lazily connects to Mongo on first use so `next build` page collection does not. */
export const authApi: AuthApi = new Proxy({} as AuthApi, {
  get(_target, prop, receiver) {
    const instance = getAuthApi();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export async function auth() {
  return getAuthApi().api.getSession({ headers: await headers() });
}

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
let authConnectionGeneration: number | undefined;

/**
 * Lazily creates Better Auth after Mongo is connected. Recreates the instance
 * if the underlying mongoose connection was replaced (e.g. after topology close).
 */
export async function getAuthApi(): Promise<AuthApi> {
  const { promise, connectionGeneration } = getMongoConnection();
  await promise;

  if (
    !authApiInstance ||
    authConnectionGeneration !== connectionGeneration
  ) {
    authApiInstance = createAuthApi();
    authConnectionGeneration = connectionGeneration;
  }
  return authApiInstance;
}

function getAuthApiSync(): AuthApi {
  const { connectionGeneration } = getMongoConnection();
  if (
    !authApiInstance ||
    authConnectionGeneration !== connectionGeneration
  ) {
    authApiInstance = createAuthApi();
    authConnectionGeneration = connectionGeneration;
  }
  return authApiInstance;
}

/**
 * Lazily connects to Mongo on first use so `next build` page collection does not.
 *
 * Important: include a `has` trap. `toNextJsHandler` does `"handler" in auth`;
 * without `has`, that check hits the empty Proxy target and falls through to
 * calling the Proxy as a function → `TypeError: … is not a function`.
 */
export const authApi: AuthApi = new Proxy({} as AuthApi, {
  get(_target, prop) {
    const instance = getAuthApiSync();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
  has(_target, prop) {
    return Reflect.has(getAuthApiSync(), prop);
  },
});

export async function auth() {
  const api = await getAuthApi();
  return api.api.getSession({ headers: await headers() });
}

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { magicLink, twoFactor } from "better-auth/plugins";

export type TraceworkAuthOptions = Readonly<{
  database: Parameters<typeof drizzleAdapter>[0];
  schema: NonNullable<Parameters<typeof drizzleAdapter>[1]>["schema"];
  baseUrl: string;
  secret: string;
  trustedOrigins: readonly string[];
  sendMagicLink: (input: { email: string; url: string; token: string }) => Promise<void>;
  allowSelfSignUp?: boolean;
  relyingPartyId: string;
  relyingPartyName?: string;
  relyingPartyOrigin: string;
}>;

export function createTraceworkAuth(options: TraceworkAuthOptions) {
  return betterAuth({
    appName: "Tracework",
    baseURL: options.baseUrl,
    secret: options.secret,
    trustedOrigins: [...options.trustedOrigins],
    database: drizzleAdapter(options.database, { provider: "pg", schema: options.schema }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: options.baseUrl.startsWith("https://"),
      disableCSRFCheck: false,
      disableOriginCheck: false,
    },
    plugins: [
      magicLink({
        expiresIn: 300,
        disableSignUp: options.allowSelfSignUp !== true,
        storeToken: "hashed",
        sendMagicLink: options.sendMagicLink,
      }),
      passkey({
        rpID: options.relyingPartyId,
        rpName: options.relyingPartyName ?? "Tracework",
        origin: options.relyingPartyOrigin,
        authenticatorSelection: { userVerification: "required" },
      }),
      twoFactor(),
    ],
  });
}

export type TraceworkAuth = ReturnType<typeof createTraceworkAuth>;

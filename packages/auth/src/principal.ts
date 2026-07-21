export type ApplicationPrincipal = Readonly<{
  userId: string;
  identityProvider: "better_auth";
  providerSubjectId: string;
  authSessionId: string;
  email: string;
  emailVerified: boolean;
  authenticationMethod: "magic_link" | "passkey" | "totp" | "unknown";
  authenticatedAt: Date;
}>;

export type BetterAuthSessionProjection = Readonly<{
  user: { id: string; email: string; emailVerified: boolean };
  session: { id: string; createdAt: Date; authenticationMethod?: string | null };
}>;

export function toApplicationPrincipal(session: BetterAuthSessionProjection): ApplicationPrincipal {
  const method = session.session.authenticationMethod;
  const authenticationMethod = method === "magic_link" || method === "passkey" || method === "totp" ? method : "unknown";
  return {
    userId: session.user.id,
    identityProvider: "better_auth",
    providerSubjectId: session.user.id,
    authSessionId: session.session.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    authenticationMethod,
    authenticatedAt: session.session.createdAt,
  };
}

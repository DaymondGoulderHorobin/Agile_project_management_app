import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MemoryReauthenticationGrantStore,
  consumeReauthenticationGrant,
  issueReauthenticationGrant,
  runAuthHandler,
  toApplicationPrincipal,
} from "../src/index.js";

describe("application principal boundary", () => {
  it("does not import organisation authority from the identity provider", () => {
    const principal = toApplicationPrincipal({
      user: { id: randomUUID(), email: "developer@example.test", emailVerified: true },
      session: { id: randomUUID(), createdAt: new Date("2026-07-22T00:00:00Z"), authenticationMethod: "passkey" },
    });
    expect(principal.authenticationMethod).toBe("passkey");
    expect(principal).not.toHaveProperty("role");
    expect(principal).not.toHaveProperty("organisationId");
  });
});

describe("High-Assurance reauthentication", () => {
  it("is one-use, short-lived, and bound to the exact snapshot/action", async () => {
    const store = new MemoryReauthenticationGrantStore();
    const now = new Date("2026-07-22T00:00:00Z");
    const binding = { userId: randomUUID(), authSessionId: randomUUID(), purpose: "execution_approval" as const, resourceId: randomUUID(), snapshotHash: "a".repeat(64) };
    const issued = await issueReauthenticationGrant(store, randomUUID(), binding, now);
    await expect(consumeReauthenticationGrant(store, issued.id, issued.token, { ...binding, snapshotHash: "b".repeat(64) }, now)).rejects.toThrow();
    await expect(consumeReauthenticationGrant(store, issued.id, issued.token, binding, now)).resolves.toMatchObject({ consumedAt: now });
    await expect(consumeReauthenticationGrant(store, issued.id, issued.token, binding, now)).rejects.toThrow();
  });
});

describe("Fastify/web request bridge", () => {
  it("preserves multiple Set-Cookie values and response bytes", async () => {
    const result = await runAuthHandler(async (request) => {
      expect(await request.json()).toEqual({ email: "guest@example.test" });
      const headers = new Headers({ "content-type": "application/json" });
      headers.append("set-cookie", "session=one; HttpOnly; Secure; SameSite=Lax");
      headers.append("set-cookie", "csrf=two; Secure; SameSite=Lax");
      return new Response("{\"ok\":true}", { status: 200, headers });
    }, { method: "POST", url: "/api/auth/sign-in/magic-link", headers: { "content-type": "application/json" }, body: { email: "guest@example.test" } }, "https://tracework.test");
    expect(result.setCookies).toHaveLength(2);
    expect(new TextDecoder().decode(result.body ?? undefined)).toBe("{\"ok\":true}");
  });
});

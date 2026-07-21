import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MemoryGitHubProvider,
  MemoryMailer,
  MemoryObjectStorage,
  guestInvitationMail,
  sha256,
  tenantObjectKey,
  verifyGitHubWebhook,
} from "../src/index.js";

describe("object storage boundaries", () => {
  it("validates checksums and tenant-scoped keys", async () => {
    const storage = new MemoryObjectStorage();
    const bytes = new TextEncoder().encode("generic workflow only");
    const key = tenantObjectKey("org-1", "object-1", "workflow notes.txt");
    await storage.put({ key, bytes, sha256: sha256(bytes), contentType: "text/plain", metadata: {} });
    expect((await storage.get(key))?.bytes).toEqual(bytes);
    await expect(storage.put({ key, bytes, sha256: "wrong", contentType: "text/plain", metadata: {} })).rejects.toThrow();
  });
});

describe("integrations", () => {
  it("creates an invitation with the prohibited-data warning", async () => {
    const mailer = new MemoryMailer();
    await mailer.send(guestInvitationMail({ recipient: "expert@example.test", inviterName: "Alex", projectName: "Booking flow", invitationUrl: "https://tracework.test/i/token", expiresAt: new Date("2030-01-01T00:00:00Z") }));
    expect(mailer.sent[0]?.text).toContain("Do not enter identifiable patient information");
  });

  it("makes branch and pull-request operations reconcilable", async () => {
    const provider = new MemoryGitHubProvider();
    const repository = { owner: "tracework", repo: "demo" };
    await provider.createOrFindBranch(repository, "tracework/demo", "abc123");
    await provider.createOrFindBranch(repository, "tracework/demo", "abc123");
    const first = await provider.createOrFindPullRequest(repository, "tracework/demo", "main", "Title", "Body");
    const second = await provider.createOrFindPullRequest(repository, "tracework/demo", "main", "Title", "Body");
    expect(first.created).toBe(true);
    expect(second).toMatchObject({ created: false, number: first.number });
  });

  it("verifies GitHub signatures with constant-time comparison", () => {
    const body = new TextEncoder().encode("{\"action\":\"opened\"}");
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(verifyGitHubWebhook("secret", body, signature)).toBe(true);
    expect(verifyGitHubWebhook("wrong", body, signature)).toBe(false);
  });
});

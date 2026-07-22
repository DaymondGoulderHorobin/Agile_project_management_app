import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type ReauthenticationPurpose = "project_approval" | "execution_approval" | "release_approval";

export type ReauthenticationBinding = Readonly<{
  userId: string;
  authSessionId: string;
  purpose: ReauthenticationPurpose;
  resourceId: string;
  snapshotHash: string;
}>;

export type ReauthenticationGrantRecord = ReauthenticationBinding & Readonly<{
  id: string;
  tokenHash: string;
  factor: "passkey_user_verification";
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export interface ReauthenticationGrantStore {
  insert(record: ReauthenticationGrantRecord): Promise<void>;
  consume(id: string, expectedLock: ReauthenticationBinding, now: Date): Promise<ReauthenticationGrantRecord | null>;
}

export type IssuedReauthenticationGrant = Readonly<{ id: string; token: string; record: ReauthenticationGrantRecord }>;

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function issueReauthenticationGrant(
  store: ReauthenticationGrantStore,
  id: string,
  binding: ReauthenticationBinding,
  now: Date,
  lifetimeMilliseconds = 15 * 60 * 1_000,
): Promise<IssuedReauthenticationGrant> {
  if (lifetimeMilliseconds <= 0 || lifetimeMilliseconds > 15 * 60 * 1_000) throw new RangeError("Reauthentication grant lifetime must be between 1ms and 15 minutes");
  const token = randomBytes(32).toString("base64url");
  const record: ReauthenticationGrantRecord = {
    id,
    ...binding,
    tokenHash: tokenHash(token),
    factor: "passkey_user_verification",
    issuedAt: now,
    expiresAt: new Date(now.getTime() + lifetimeMilliseconds),
    consumedAt: null,
  };
  await store.insert(record);
  return { id, token, record };
}

export async function consumeReauthenticationGrant(
  store: ReauthenticationGrantStore,
  id: string,
  rawToken: string,
  binding: ReauthenticationBinding,
  now: Date,
): Promise<ReauthenticationGrantRecord> {
  const consumed = await store.consume(id, binding, now);
  if (!consumed) throw new Error("Reauthentication grant is unavailable, expired, consumed, or does not match this action");
  const supplied = Buffer.from(tokenHash(rawToken), "hex");
  const expected = Buffer.from(consumed.tokenHash, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Reauthentication grant token is invalid");
  return consumed;
}

export class MemoryReauthenticationGrantStore implements ReauthenticationGrantStore {
  readonly #records = new Map<string, ReauthenticationGrantRecord>();

  public async insert(record: ReauthenticationGrantRecord): Promise<void> {
    if (this.#records.has(record.id)) throw new Error("Grant already exists");
    this.#records.set(record.id, structuredClone(record));
  }

  public async consume(id: string, expected: ReauthenticationBinding, now: Date): Promise<ReauthenticationGrantRecord | null> {
    const record = this.#records.get(id);
    if (!record || record.consumedAt || record.expiresAt <= now) return null;
    const matches = record.userId === expected.userId
      && record.authSessionId === expected.authSessionId
      && record.purpose === expected.purpose
      && record.resourceId === expected.resourceId
      && record.snapshotHash === expected.snapshotHash;
    if (!matches) return null;
    const consumed = { ...record, consumedAt: now };
    this.#records.set(id, consumed);
    return structuredClone(consumed);
  }
}

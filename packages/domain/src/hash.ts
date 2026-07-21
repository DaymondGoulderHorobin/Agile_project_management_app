import { createHash } from "node:crypto";

import { DomainError } from "./errors.js";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

function canonicaliseValue(value: JsonValue): string {
  if (typeof value === "string") {
    return JSON.stringify(value.replace(/\r\n?/g, "\n"));
  }

  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DomainError(
        "INVALID_INPUT",
        "Canonical JSON cannot contain a non-finite number",
      );
    }

    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicaliseValue(item)).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${canonicaliseValue(entryValue)}`,
    )
    .join(",")}}`;
}

/**
 * Produces deterministic JSON for hashing. The supported JsonValue surface follows
 * RFC 8785's JSON-only constraints and rejects non-finite numbers.
 */
export function canonicalJson(value: JsonValue): string {
  return canonicaliseValue(value);
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCanonicalJson(value: JsonValue): string {
  return sha256(canonicalJson(value));
}

export interface ContentHash {
  readonly algorithm: "sha256";
  readonly canonicalSchemaVersion: string;
  readonly value: string;
}

export function createContentHash(
  canonicalSchemaVersion: string,
  payload: JsonValue,
): ContentHash {
  if (canonicalSchemaVersion.trim().length === 0) {
    throw new DomainError(
      "INVALID_INPUT",
      "Canonical schema version is required",
    );
  }

  return Object.freeze({
    algorithm: "sha256",
    canonicalSchemaVersion,
    value: hashCanonicalJson(payload),
  });
}

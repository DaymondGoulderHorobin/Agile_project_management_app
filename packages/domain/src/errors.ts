export type DomainErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVARIANT_VIOLATION"
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "STALE_VERSION";

export class DomainError extends Error {
  public constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function invariant(
  condition: unknown,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): asserts condition {
  if (!condition) {
    throw new DomainError("INVARIANT_VIOLATION", message, details);
  }
}

export function assertNever(value: never, message = "Unexpected value"): never {
  throw new DomainError("INVALID_INPUT", message, { value });
}

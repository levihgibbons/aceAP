/** Errors raised by domain services; API routes map `code` to an HTTP status. */
export type DomainErrorCode = "not_found" | "forbidden" | "invalid" | "conflict" | "closed" | "rate_limited" | "unauthenticated";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const HTTP_STATUS: Record<DomainErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  closed: 409,
  invalid: 422,
  rate_limited: 429,
};

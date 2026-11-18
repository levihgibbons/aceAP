import { DomainError } from "@/lib/errors";

/** A validation problem tied to one form field (the UI shows it next to that field). */
export class AccountFieldError extends DomainError {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super("invalid", message);
    this.name = "AccountFieldError";
  }
}

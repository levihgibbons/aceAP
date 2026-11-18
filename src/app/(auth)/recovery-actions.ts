"use server";
/**
 * Password-recovery server actions (useActionState-compatible).
 *  - forgotPassword(prev, formData)  field: email. Always the same answer for
 *    known and unknown addresses; says honestly when email isn't configured.
 *  - resetPassword(prev, formData)   fields: token, password, confirm. On
 *    success every old session is gone; a fresh one is started and the user
 *    is sent home.
 */
import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { RESET_REQUEST_MESSAGE, newPasswordSchema, requestPasswordReset, resetPasswordWithToken } from "@/modules/accounts/password";
import { homeFor, startSession } from "@/modules/auth/session";
import { clientKey, formString } from "@/components/account/request";

export interface ForgotPasswordState {
  status: "idle" | "sent" | "unavailable" | "error";
  message?: string;
  fieldError?: string;
  email?: string;
}

export async function forgotPassword(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = formString(formData, "email").trim();
  if (!email) return { status: "error", fieldError: "Enter your email address.", email };
  try {
    const result = await requestPasswordReset(email, await clientKey());
    if (result.status === "email_unavailable") {
      return {
        status: "unavailable",
        message: "Email isn't set up on this server, so we can't send reset links. Ask your teacher, school administrator or AceAP support to help you get back in.",
        email,
      };
    }
    return { status: "sent", message: RESET_REQUEST_MESSAGE };
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === "invalid") return { status: "error", fieldError: err.message, email };
      return { status: "error", message: err.message, email };
    }
    console.error("forgotPassword failed", err);
    return { status: "error", message: "We couldn't process that right now. Please try again.", email };
  }
}

export interface ResetPasswordState {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirm", string>>;
}

export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = formString(formData, "token");
  const password = formString(formData, "password");
  const confirm = formString(formData, "confirm");
  const strength = newPasswordSchema.safeParse(password);
  if (!strength.success) return { fieldErrors: { password: strength.error.issues[0]?.message ?? "Choose a longer password." } };
  if (password !== confirm) return { fieldErrors: { confirm: "The passwords don't match." } };

  let destination: string;
  try {
    const user = await resetPasswordWithToken({ token, password }, await clientKey());
    await startSession(user.id);
    destination = homeFor(user.role);
  } catch (err) {
    if (err instanceof DomainError) return { error: err.message };
    console.error("resetPassword failed", err);
    return { error: "We couldn't reset your password right now. Please try again." };
  }
  redirect(destination);
}

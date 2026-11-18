"use server";
/**
 * Account settings server actions (useActionState-compatible). Every action
 * re-checks the session; services re-check the password where required.
 *  - updateNameAction        field: name
 *  - changePasswordAction    fields: currentPassword, newPassword, confirmPassword
 *  - deleteAccountAction     fields: password, confirmation ("DELETE")
 */
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { requestAccountDeletion } from "@/modules/accounts/deletion";
import { AccountFieldError } from "@/modules/accounts/errors";
import { changePassword, newPasswordSchema } from "@/modules/accounts/password";
import { updateProfileName } from "@/modules/accounts/profile";
import { SESSION_COOKIE, requireApiUser } from "@/modules/auth/session";
import { formString } from "./request";

export interface AccountFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

function failure(err: unknown, fallback: string): AccountFormState {
  if (err instanceof AccountFieldError)
    return { status: "error", fieldErrors: { [err.field]: err.message } };
  if (err instanceof DomainError) return { status: "error", message: err.message };
  console.error("[account]", err);
  return { status: "error", message: fallback };
}

export async function updateNameAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  try {
    const user = await requireApiUser();
    const { name } = await updateProfileName(user, formString(formData, "name"));
    refresh();
    return { status: "success", message: `Saved. You're now shown as ${name}.` };
  } catch (err) {
    if (err instanceof DomainError && err.code === "invalid")
      return { status: "error", fieldErrors: { name: err.message } };
    return failure(err, "We couldn't save your name right now. Please try again.");
  }
}

export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const currentPassword = formString(formData, "currentPassword");
  const newPassword = formString(formData, "newPassword");
  const confirmPassword = formString(formData, "confirmPassword");
  if (!currentPassword)
    return { status: "error", fieldErrors: { currentPassword: "Enter your current password." } };
  const strength = newPasswordSchema.safeParse(newPassword);
  if (!strength.success)
    return {
      status: "error",
      fieldErrors: {
        newPassword: strength.error.issues[0]?.message ?? "Choose a longer password.",
      },
    };
  if (newPassword !== confirmPassword)
    return { status: "error", fieldErrors: { confirmPassword: "The new passwords don't match." } };
  try {
    const user = await requireApiUser();
    const jar = await cookies();
    const { otherSessionsRevoked } = await changePassword(
      user,
      { currentPassword, newPassword },
      jar.get(SESSION_COOKIE)?.value,
    );
    return {
      status: "success",
      message:
        otherSessionsRevoked > 0
          ? `Password changed. ${otherSessionsRevoked} other session${otherSessionsRevoked === 1 ? " was" : "s were"} signed out.`
          : "Password changed. Any other sessions were signed out.",
    };
  } catch (err) {
    return failure(err, "We couldn't change your password right now. Please try again.");
  }
}

export async function deleteAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  try {
    const user = await requireApiUser();
    await requestAccountDeletion(user, {
      password: formString(formData, "password"),
      confirmation: formString(formData, "confirmation"),
    });
    // The session rows are already gone; drop the cookie too.
    (await cookies()).delete(SESSION_COOKIE);
  } catch (err) {
    return failure(err, "We couldn't delete your account right now. Please try again.");
  }
  redirect("/login?deleted=1");
}

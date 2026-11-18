import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { isResetTokenUsable } from "@/modules/accounts/password";
import { PASSWORD_MIN_LENGTH } from "@/modules/auth/password";
import { ResetPasswordForm } from "../_components/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const usable = token ? await isResetTokenUsable(token) : false;

  return (
    <>
      <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">
        Choose a new password
      </h1>
      {usable ? (
        <>
          <p className="mt-1.5 text-[0.9375rem] text-muted">
            Pick a password you don&apos;t use anywhere else.
          </p>
          <div className="mt-6">
            <ResetPasswordForm token={token} minPasswordLength={PASSWORD_MIN_LENGTH} />
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-5">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-3 text-sm text-bad"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              This reset link is invalid, has expired or was already used. Links work once and
              expire after 30 minutes.
            </p>
          </div>
          <ButtonLink href="/forgot-password" size="lg" fullWidth>
            Request a new link
          </ButtonLink>
          <p className="text-center text-sm text-muted">
            <Link
              href="/login"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

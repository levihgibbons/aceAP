import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../_components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">
        Reset your password
      </h1>
      <p className="mt-1.5 text-[0.9375rem] text-muted">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

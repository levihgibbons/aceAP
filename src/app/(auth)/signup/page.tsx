import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PASSWORD_MIN_LENGTH } from "@/modules/auth/password";
import { getCurrentUser, homeFor } from "@/modules/auth/session";
import { SignupForm } from "../_components/SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <>
      <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Create your account</h1>
      <p className="mt-1.5 text-[0.9375rem] text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <div className="mt-6">
        <SignupForm minPasswordLength={PASSWORD_MIN_LENGTH} />
      </div>
      {process.env.ACEAP_DEMO_LOGIN !== "0" ? (
      <p className="mt-6 text-center text-sm text-muted">
        Just looking?{" "}
        <Link href="/login#demo" className="font-medium text-accent underline-offset-4 hover:underline">
          Try the demo instead
        </Link>
      </p>
      ) : null}
    </>
  );
}

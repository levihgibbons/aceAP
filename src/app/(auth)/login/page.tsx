import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Divider } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/modules/auth/session";
import { DemoSignIn } from "../_components/DemoSignIn";
import { demoAdminLoginAllowed } from "../_components/demo-policy";
import { LoginForm } from "../_components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : undefined;
  const demoEnabled = process.env.ACEAP_DEMO_LOGIN !== "0";
  const deleted = params.deleted === "1";

  return (
    <>
      <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
      <p className="mt-1.5 text-[0.9375rem] text-muted">
        New to AceAP?{" "}
        <Link href="/signup" className="font-medium text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      {next ? <p className="mt-4 rounded-lg bg-info-soft px-3.5 py-2.5 text-sm text-info">Sign in to continue to that page.</p> : null}
      {deleted ? (
        <p role="status" className="mt-4 rounded-lg bg-info-soft px-3.5 py-2.5 text-sm text-info">
          Your account has been deleted and you&apos;ve been signed out everywhere. Your data will be permanently removed after the
          grace period.
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-accent underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </p>
      {demoEnabled ? (
        <>
          <Divider label="or explore with demo data" className="my-8" />
          <div id="demo">
            <DemoSignIn includeAdmin={demoAdminLoginAllowed()} />
          </div>
        </>
      ) : null}
    </>
  );
}

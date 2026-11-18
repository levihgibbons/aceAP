/**
 * Confirm linking an LMS (Canvas) account to the signed-in AceAP account.
 * Reached by a top-level redirect from /api/lti/launch with a short-lived
 * signed token. Links are created only by this explicit confirmation.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/modules/auth/session";
import { verifyPendingLink } from "@/modules/integrations/lms/launchFlow";
import { confirmLink } from "./actions";

export const metadata: Metadata = { title: "Link your LMS account", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  expired: "This link request expired or is invalid. Open the activity from your LMS again.",
  conflict:
    "That LMS account is already linked to a different AceAP account, or your AceAP account is already linked to another LMS account. Ask your teacher or administrator for help.",
  failed: "AceAP couldn't link the accounts. Please try again from your LMS.",
};

export default async function LinkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const error = typeof sp.error === "string" ? sp.error : null;
  const user = await getCurrentUser();
  if (!error && token && !user) redirect(`/login?next=${encodeURIComponent(`/lti/link?token=${token}`)}`);

  let pending: ReturnType<typeof verifyPendingLink> = null;
  try {
    pending = token ? verifyPendingLink(token) : null;
  } catch {
    pending = null;
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      {error || !pending || !user ? (
        <ErrorState headingLevel={1} title="Can't link accounts" description={ERRORS[error ?? "expired"] ?? ERRORS.expired} retry={{ href: "/", label: "Back to AceAP" }} />
      ) : (
        <Card className="w-full">
          <CardBody>
            <Link2 className="size-6 text-accent" aria-hidden />
            <h1 className="mt-3 font-display text-2xl font-semibold text-ink">Link your LMS account</h1>
            <p className="mt-2 text-ink-2">
              You opened AceAP from {pending.contextTitle ? <strong>{pending.contextTitle}</strong> : "your LMS"}. Link it to the AceAP account you&apos;re
              signed in with — <strong>{user.name}</strong> ({user.email}) — so future launches open your work directly
              {pending.deepLinkToken
                ? ". Then you can choose AceAP assignments to add to your course"
                : pending.instructor
                  ? ""
                  : " and your teacher can receive your grades"}
              .
            </p>
            <p className="mt-2 text-sm text-muted">
              If this isn&apos;t your account, sign out and sign in with the right one first. Accounts are never matched automatically by name or email.
            </p>
            <form action={confirmLink} className="mt-6 flex flex-wrap gap-3">
              <input type="hidden" name="token" value={token} />
              <Button type="submit">Link accounts</Button>
              <ButtonLink href="/" variant="ghost">
                Cancel
              </ButtonLink>
            </form>
          </CardBody>
        </Card>
      )}
    </main>
  );
}

/**
 * Deep Linking 2.0 activity picker. Reached by a top-level redirect from
 * /api/lti/launch (or /lti/link after confirming an account link) with a
 * short-lived signed token holding the validated deep-linking settings.
 *
 * Only the AceAP staff account explicitly linked to the launching LMS user
 * may use it; it lists that teacher's classes and assignments in the
 * connection's organisation. The form posts to /api/lti/deep-link, which
 * signs the response and returns it to the LMS.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, Link2 } from "lucide-react";
import { Button, ButtonLink, EmptyState, ErrorState, formatDate } from "@/components/ui";
import { KIND_LABEL } from "@/components/assignments/labels";
import { getCurrentUser } from "@/modules/auth/session";
import { listPickerClasses, verifyDeepLinkSession, type DeepLinkSession } from "@/modules/integrations/lms/deepLinkFlow";

export const metadata: Metadata = { title: "Choose AceAP assignments", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  expired: "This request expired or is invalid. Start again from your LMS (for example, add an assignment and choose AceAP).",
  no_selection: "Select at least one assignment, or choose “Cancel and return”.",
  single: "Your LMS accepts only one activity here. Select one assignment.",
  forbidden: "One of the selected assignments isn't available to you in this school. Reload the page and try again.",
  failed: "AceAP couldn't build the response for your LMS (for example, the signing key is missing). Start again from your LMS.",
};

export default async function DeepLinkPickerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const error = typeof sp.error === "string" ? sp.error : null;
  const user = await getCurrentUser();
  if (token && !user) redirect(`/login?next=${encodeURIComponent(`/lti/deep-link?token=${token}`)}`);

  let session: DeepLinkSession | null = null;
  try {
    session = token ? verifyDeepLinkSession(token) : null;
  } catch {
    session = null;
  }
  if (!session || !user) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
        <ErrorState title="Can't choose activities" description={ERRORS.expired} retry={{ href: "/", label: "Back to AceAP" }} />
      </main>
    );
  }

  const access = await listPickerClasses(user, session);
  if (!access.ok) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
        <ErrorState title="Can't choose activities" description={access.message} retry={{ href: "/", label: "Back to AceAP" }} />
      </main>
    );
  }

  const multiple = session.settings.acceptMultiple;
  const total = access.classes.reduce((n, c) => n + c.assignments.length, 0);
  const errorText = error ? (ERRORS[error] ?? ERRORS.failed) : null;

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link2 className="size-6 text-accent" aria-hidden />
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink">Choose AceAP {multiple ? "assignments" : "an assignment"}</h1>
      <p className="mt-2 text-ink-2">
        {session.contextTitle ? (
          <>
            For <strong>{session.contextTitle}</strong>.{" "}
          </>
        ) : null}
        Each one becomes a link in your LMS course with a grade column worth the assignment&apos;s points. Students open it in a new tab.
      </p>
      <p className="mt-1 text-sm text-muted">
        Signed in as {user.name}. Grades are only sent to your LMS when you choose “Send grades to Canvas” in the AceAP gradebook.
      </p>

      {errorText ? (
        <p role="alert" className="mt-6 rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {errorText}
        </p>
      ) : null}

      {total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={access.classes.length === 0 ? "No classes in this school" : "No assignments yet"}
            description={
              access.classes.length === 0
                ? "You don't teach a class in the school this LMS connection belongs to. Create the class in AceAP first, then start again from your LMS."
                : "Create an assignment in AceAP first, then start again from your LMS."
            }
            action={
              <ButtonLink href="/teacher/assignments/new" target="_blank" rel="noopener" variant="secondary" icon={<ExternalLink aria-hidden="true" className="size-4" />}>
                Create an assignment (new tab)
              </ButtonLink>
            }
          />
          <form method="post" action="/api/lti/deep-link" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" name="intent" value="cancel" variant="secondary">
              Return to your LMS without adding anything
            </Button>
          </form>
        </div>
      ) : (
        <form method="post" action="/api/lti/deep-link" className="mt-8 space-y-6">
          <input type="hidden" name="token" value={token} />
          {access.classes
            .filter((c) => c.assignments.length > 0)
            .map((c) => (
              <fieldset key={c.id} className="min-w-0 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
                <legend className="float-left w-full font-display text-base font-semibold text-ink">{c.name}</legend>
                <div className="clear-left pt-1">
                  <ul className="mt-3 space-y-3">
                    {c.assignments.map((a) => {
                      const id = `dl-${a.id}`;
                      const detail = `${KIND_LABEL[a.kind]} · ${a.points} pts${a.dueAt ? ` · due ${formatDate(a.dueAt, { short: true })}` : ""}`;
                      return (
                        <li key={a.id} className="flex items-start gap-3">
                          <input
                            id={id}
                            type={multiple ? "checkbox" : "radio"}
                            name="assignmentId"
                            value={a.id}
                            aria-describedby={`${id}-desc`}
                            className="mt-0.5 size-4.5 shrink-0 cursor-pointer accent-accent"
                          />
                          <div className="min-w-0 text-sm">
                            <label htmlFor={id} className="cursor-pointer font-medium text-ink">
                              {a.title}
                            </label>
                            <p id={`${id}-desc`} className="mt-0.5 text-muted">
                              {detail}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </fieldset>
            ))}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" name="intent" value="add">
              Add to my LMS course
            </Button>
            <Button type="submit" name="intent" value="cancel" variant="ghost">
              Cancel and return
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

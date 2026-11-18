/**
 * Public landing page. Explains the proposition plainly and routes people to
 * sign in, the demo, or sign-up. Signed-in visitors get a dashboard button
 * (no automatic redirect, so the page stays shareable).
 */
import Link from "next/link";
import { ArrowRight, BookOpenCheck, ChartNoAxesColumn, FlaskConical, GraduationCap, Library, ShieldCheck } from "lucide-react";
import { ButtonLink, MasteryBadge } from "@/components/ui";
import { Logo } from "@/components/shell/Logo";
import { getCurrentUser, homeFor } from "@/modules/auth/session";
import { getCatalog } from "@/modules/curriculum/queries";

const PILOTS = [
  { id: "calculus-ab", course: "AP Calculus AB", scope: "Core derivative rules and the chain rule", sim: "Derivative Explorer" },
  { id: "microeconomics", course: "AP Microeconomics", scope: "Production, costs, profit maximisation and the shutdown rule", sim: "Firm Behavior Lab" },
  { id: "physics-1", course: "AP Physics 1", scope: "One-dimensional kinematics and motion graphs", sim: "Motion Lab" },
];

async function catalogSummary() {
  try {
    const catalog = await getCatalog();
    return {
      total: catalog.length,
      pilots: catalog.filter((c) => c.contentStatus === "pilot_available").length,
      verifiedOn: catalog[0]?.catalogVerifiedOn ?? null,
    };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [user, summary] = await Promise.all([getCurrentUser().catch(() => null), catalogSummary()]);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
        <Link href="/" aria-label="AceAP home">
          <Logo />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          {user ? (
            <ButtonLink href={homeFor(user.role)} size="sm" iconRight={<ArrowRight className="size-4" aria-hidden />}>
              Go to your dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Create an account
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="animate-rise">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Mastery-based AP learning</p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-5xl">
                One place to learn. One system to measure mastery. One record that grows with you.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
                AceAP teaches AP courses through interactive lessons, practice and simulations — and keeps an evidence-based record of what each
                student can actually do, which teachers can inspect and students keep.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <ButtonLink href={homeFor(user.role)} size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                    Go to your dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login#demo" size="lg" iconRight={<ArrowRight className="size-4" aria-hidden />}>
                      Try the demo
                    </ButtonLink>
                    <ButtonLink href="/signup" size="lg" variant="secondary">
                      Create an account
                    </ButtonLink>
                  </>
                )}
              </div>
              <p className="mt-4 text-sm text-muted">The demo uses fictional students, teachers and schools.</p>
            </div>

            <figure className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-raised sm:p-6" aria-labelledby="mastery-example">
              <figcaption id="mastery-example" className="text-sm font-medium text-muted">
                What a mastery state looks like
              </figcaption>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-display text-xl font-semibold text-ink">Chain rule: powers of functions</p>
                <MasteryBadge level="proficient" />
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-2">
                <li>• 6 of 7 answers correct without help, across 5 different questions</li>
                <li>• 2 answers given with hints — counted for less</li>
                <li>• 3 problem types covered; correct on a quiz as well as in practice</li>
              </ul>
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
                <span className="font-medium text-ink">For Mastered:</span> one more correct answer in a separate sitting.
              </div>
              <p className="mt-4 text-xs text-faint">Illustration. Real states are calculated from each student&apos;s graded responses.</p>
            </figure>
          </div>
        </section>

        <section className="border-y border-line bg-surface" aria-labelledby="how">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-10">
            <h2 id="how" className="sr-only">
              How AceAP works
            </h2>
            {[
              {
                icon: BookOpenCheck,
                title: "Mastery isn't completion",
                body: "Watching a lesson or leaving a tab open earns nothing. Mastery comes from answers given independently, across different kinds of problems, on more than one occasion — and every level explains itself.",
              },
              {
                icon: ChartNoAxesColumn,
                title: "Teachers see the evidence",
                body: "An objective-by-objective heatmap separates “no evidence yet” from “struggling”, opens to the actual attempts behind each cell, and turns gaps into targeted assignments.",
              },
              {
                icon: Library,
                title: "Knowledge that stays yours",
                body: "Each student has a private, linked notes vault connected to their mastery record. Teachers only see notes a student chooses to share. Everything can be exported.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-6 text-accent" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-10" aria-labelledby="pilots">
          <h2 id="pilots" className="font-display text-2xl font-semibold tracking-[-0.015em] text-ink">
            Pilot learning sequences
          </h2>
          <p className="mt-2 max-w-2xl text-ink-2">
            Three courses have complete, assessed sequences for part of the curriculum today. Each includes lessons, worked examples, practice,
            a quiz, a unit test and an interactive simulation.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {PILOTS.map((p) => (
              <li key={p.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">Pilot sequence</p>
                <p className="mt-2 font-display text-lg font-semibold text-ink">{p.course}</p>
                <p className="mt-1 text-sm text-ink-2">{p.scope}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <FlaskConical className="size-4" aria-hidden /> {p.sim}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-start gap-2 text-sm text-muted">
            <GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden />
            {summary
              ? `All ${summary.total} AP courses are in the catalog with an honest content status — ${summary.pilots} have pilot lessons; the rest show their official unit outline or catalog entry until lessons are written.`
              : "Every AP course is in the catalog with an honest content status."}
          </p>
        </section>

        <section className="border-t border-line bg-surface-2" aria-labelledby="privacy">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 sm:px-6 md:flex-row md:items-start md:gap-8 lg:px-10">
            <ShieldCheck className="size-6 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 id="privacy" className="font-display text-lg font-semibold text-ink">
                Built for student privacy
              </h2>
              <p className="mt-1 max-w-3xl text-ink-2">
                School boundaries are enforced in the database, personal notes are private by default, student data isn&apos;t used to train AI
                models, and the AI tutor follows each teacher&apos;s assessment rules. AceAP is pre-release software: schools should complete a
                privacy review and data agreement before using it with students.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs leading-relaxed text-faint sm:px-6 lg:px-10">
        <p>
          AP® and Advanced Placement® are registered trademarks of College Board, which is not affiliated with, and does not endorse, AceAP.
          {summary?.verifiedOn ? ` Course catalog verified against College Board's AP Central on ${summary.verifiedOn}.` : ""}
        </p>
      </footer>
    </div>
  );
}

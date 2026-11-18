import type { Metadata } from "next";
import Link from "next/link";
import { Link2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, DataTable, EmptyState, Section, formatDate, pluralize } from "@/components/ui";
import { CanvasRosterReviewForm } from "@/components/teacher/CanvasRosterReviewForm";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { CopyButton } from "@/components/teacher/CopyButton";
import { studentHref } from "@/components/teacher/format";
import { loadClassContext, orNotFound } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { getRosterReview, ROSTER_PROPOSAL_RETENTION_DAYS, type CanvasMemberView } from "@/modules/integrations/lms/roster";

export const metadata: Metadata = { title: "Canvas roster" };

/** Canvas sends a name only at the "name_only"/"public" privacy levels; otherwise only an opaque id. */
function memberLabel(m: CanvasMemberView) {
  return (
    <span className="flex flex-col">
      <span className="font-medium text-ink">{m.canvasName ?? `Canvas user ${m.externalUserId.slice(0, 8)}${m.externalUserId.length > 8 ? "…" : ""}`}</span>
      {m.canvasEmail ? <span className="text-xs text-muted">{m.canvasEmail}</span> : null}
      {!m.canvasName && !m.canvasEmail ? <span className="text-xs text-muted">Canvas didn’t share a name or e-mail</span> : null}
    </span>
  );
}

function statusBadge(status: CanvasMemberView["status"]) {
  return status === "active" ? <Badge tone="neutral">Active in Canvas</Badge> : <Badge tone="warn">Inactive in Canvas</Badge>;
}

const LINK_MESSAGE =
  "Please link your AceAP account to our Canvas course: open AceAP from Canvas (the AceAP link in the course menu or any AceAP assignment), sign in to AceAP if asked, and confirm “Link accounts”. Only you can do this — your teacher can’t link accounts for you.";

export default async function CanvasRosterPage({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const ctx = await loadClassContext(user, classId);
  const review = await orNotFound(getRosterReview(user, classId));
  const inviteMessage = `Join our AceAP class “${ctx.name}”: sign in to AceAP (or create a free student account) and enter the join code ${ctx.joinCode}. Then open AceAP once from our Canvas course and confirm “Link accounts” so your grades can be sent to Canvas.`;

  return (
    <>
      <ClassHeader ctx={ctx} current="canvas" title="Canvas roster" description="Compare your Canvas course with this class. Proposals only — nothing is linked or enrolled automatically." />

      <Card className="mb-8" padded={false}>
        <CardHeader
          titleAs="h2"
          title="How this works"
          description="AceAP never links accounts or adds students from Canvas. Each student links their own account by opening AceAP from Canvas and confirming the link while signed in."
        />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
            <ul className="space-y-2 text-sm text-ink-2">
              <li className="flex gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>A suggestion appears only when the e-mail Canvas shares exactly matches the account e-mail of a student already in this class. Names are never used to match.</span>
              </li>
              <li className="flex gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  Names and e-mails appear only if your Canvas administrator allows AceAP to receive them. The review is kept for {ROSTER_PROPOSAL_RETENTION_DAYS} days, then deleted.
                </span>
              </li>
            </ul>
            {review.canReview ? <CanvasRosterReviewForm classId={ctx.id} hasSnapshot={review.snapshotAt !== null} /> : null}
          </div>
          {review.courses.length ? (
            <p className="mt-4 text-xs text-muted">
              Linked Canvas course{review.courses.length === 1 ? "" : "s"}:{" "}
              {review.courses.map((c) => `${c.externalCourseId}${c.hasRoster ? "" : " (no roster address yet)"}`).join(", ")}
              {review.snapshotAt ? ` · Last reviewed ${formatDate(review.snapshotAt)}` : " · Not reviewed yet"}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {!review.canReview ? (
        <EmptyState
          icon={<Link2 />}
          title={review.courses.length ? "Canvas hasn’t shared this course’s roster address yet" : "This class isn’t linked to a Canvas course yet"}
          description="A Canvas course is linked to this class the first time you open an AceAP assignment from that course in Canvas as the teacher. Canvas sends the roster address with that launch."
        />
      ) : review.snapshotAt === null ? (
        <EmptyState icon={<Users />} title="No review yet" description="Choose “Review Canvas roster” to fetch the Canvas course roster and compare it with this class." />
      ) : (
        <>
          <Section id="suggestions" title="Suggestions" description="Same e-mail in Canvas and AceAP. Not linked: ask the student to link their account from Canvas.">
            <DataTable
              caption="Suggested matches between Canvas members and students in this class"
              columns={[
                { key: "canvas", header: "Canvas member", rowHeader: true },
                { key: "student", header: "AceAP student" },
                { key: "action", header: <span className="sr-only">Actions</span>, align: "right" },
              ]}
              rows={review.suggestions.map((s) => ({
                id: s.externalUserId,
                canvas: memberLabel(s),
                student: (
                  <Link href={studentHref(s.userId, ctx.id)} className="rounded underline-offset-4 hover:underline">
                    {s.studentName}
                  </Link>
                ),
                action: <CopyButton value={LINK_MESSAGE} label="Copy “ask to link” message" summary={`The link instructions for ${s.studentName}`} />,
              }))}
              empty={<p className="text-sm text-muted">No suggestions.</p>}
            />
          </Section>

          <Section id="unlinked" title="In this class, not linked to Canvas" description="Live list. Grades for these students can’t be sent to Canvas until they link their account.">
            <DataTable
              caption="Students in this class without a Canvas link"
              columns={[
                { key: "student", header: "AceAP student", rowHeader: true },
                { key: "hint", header: "Canvas" },
                { key: "action", header: <span className="sr-only">Actions</span>, align: "right" },
              ]}
              rows={review.enrolledUnlinked.map((s) => ({
                id: s.userId,
                student: (
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={studentHref(s.userId, ctx.id)} className="rounded underline-offset-4 hover:underline">
                      {s.studentName}
                    </Link>
                    {s.isDemo ? <Badge tone="neutral">Demo</Badge> : null}
                  </span>
                ),
                hint: s.suggestion ? <Badge tone="info">Suggested: same e-mail as a Canvas member</Badge> : <span className="text-muted">No match in the last review</span>,
                action: <CopyButton value={LINK_MESSAGE} label="Copy “ask to link” message" summary={`The link instructions for ${s.studentName}`} />,
              }))}
              empty={<p className="text-sm text-muted">Every student in this class has linked their Canvas account.</p>}
            />
          </Section>

          <Section
            id="not-in-class"
            title="In Canvas, not in this class"
            description="Canvas learners who haven’t joined this AceAP class (or whose linked AceAP account isn’t in it)."
            action={<CopyButton value={inviteMessage} label="Copy invite message" summary="The invite with the join code" />}
          >
            <DataTable
              caption="Canvas learners who are not in this class"
              columns={[
                { key: "canvas", header: "Canvas member", rowHeader: true },
                { key: "status", header: "Status" },
                { key: "note", header: "Next step" },
              ]}
              rows={review.canvasNotInClass.map((m) => ({
                id: m.externalUserId,
                canvas: memberLabel(m),
                status: statusBadge(m.status),
                note: m.linkedElsewhere ? (
                  <span className="text-sm text-ink-2">Has a linked AceAP account that isn’t in this class — share the join code.</span>
                ) : (
                  <span className="text-sm text-ink-2">Share the join code ({ctx.joinCode}), then they link from Canvas.</span>
                ),
              }))}
              empty={<EmptyState icon={<UserPlus />} title="Everyone is here" description="Every Canvas learner from the last review is in this class." bare />}
            />
          </Section>

          <Section id="linked" title="Linked and in this class" description="Canvas members whose own explicit link points to a student in this class.">
            <DataTable
              caption="Canvas members linked to students in this class"
              columns={[
                { key: "canvas", header: "Canvas member", rowHeader: true },
                { key: "student", header: "AceAP student" },
                { key: "status", header: "Status" },
              ]}
              rows={review.linkedEnrolled.map((m) => ({
                id: m.externalUserId,
                canvas: memberLabel(m),
                student: (
                  <Link href={studentHref(m.userId, ctx.id)} className="rounded underline-offset-4 hover:underline">
                    {m.studentName}
                  </Link>
                ),
                status: statusBadge(m.status),
              }))}
              empty={<p className="text-sm text-muted">No linked Canvas members yet.</p>}
            />
          </Section>

          {review.canvasStaffCount > 0 ? (
            <p className="mt-8 text-xs text-muted">
              {pluralize(review.canvasStaffCount, "Canvas member")} without the student role (teachers, TAs, designers) {review.canvasStaffCount === 1 ? "is" : "are"} not listed.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}

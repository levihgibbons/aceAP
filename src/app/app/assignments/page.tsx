import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { asUser } from "@/db/client";
import { ButtonLink, Card, EmptyState, PageHeader, Section, pluralize } from "@/components/ui";
import { AssignmentList } from "@/components/student/AssignmentList";
import { requireStudent } from "@/modules/auth/session";
import { listStudentAssignments } from "@/modules/learning/overview";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  const user = await requireStudent();
  const now = new Date();
  const all = await asUser({ id: user.id, role: user.role }, (tx) =>
    listStudentAssignments(tx, user.id),
  );

  const byDue = (a: { dueAt: Date | null }, b: { dueAt: Date | null }) =>
    (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);
  const pastDue = all
    .filter((a) => !a.done && a.dueAt && a.dueAt.getTime() < now.getTime())
    .sort(byDue);
  const upcoming = all
    .filter((a) => !a.done && !(a.dueAt && a.dueAt.getTime() < now.getTime()))
    .sort(byDue);
  const completed = all.filter((a) => a.done).sort((a, b) => -byDue(a, b));
  const classes = new Set(all.map((a) => a.className)).size;

  const groups = [
    {
      id: "past-due",
      title: "Past due",
      description:
        "Not submitted and past the due date. You can usually still submit — it will be marked late.",
      items: pastDue,
    },
    { id: "upcoming", title: "Upcoming", description: "Soonest first.", items: upcoming },
    {
      id: "completed",
      title: "Completed",
      description:
        "Submitted at least once. Open one to see your best score or try again if attempts remain.",
      items: completed,
    },
  ];

  return (
    <>
      <PageHeader
        title="Assignments"
        description={
          all.length
            ? `${pluralize(all.length, "assignment")} from ${pluralize(classes, "class", "classes")}.`
            : "Work your teachers assign shows up here."
        }
      />
      {all.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No assignments yet"
          description="When a teacher assigns a lesson, practice or quiz in one of your classes, it appears here with its due date."
          action={
            <ButtonLink href="/app" variant="secondary">
              Join a class from Home
            </ButtonLink>
          }
        />
      ) : (
        groups.map((g) => (
          <Section
            key={g.id}
            id={g.id}
            title={`${g.title} (${g.items.length})`}
            description={g.items.length ? g.description : undefined}
          >
            {g.items.length ? (
              <Card className="py-1 sm:py-1">
                <AssignmentList assignments={g.items} now={now} label={g.title} />
              </Card>
            ) : (
              <p className="text-sm text-muted">
                {g.id === "past-due"
                  ? "Nothing past due. Nice work."
                  : g.id === "upcoming"
                    ? "Nothing upcoming right now."
                    : "Nothing submitted yet."}
              </p>
            )}
          </Section>
        ))
      )}
    </>
  );
}

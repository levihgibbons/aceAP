import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge, ButtonLink, DataTable, EmptyState, PageHeader } from "@/components/ui";
import { AI_POLICY, classHref } from "@/components/teacher/format";
import { requireStaff } from "@/modules/auth/session";
import { listClassesForStaff } from "@/modules/classrooms/service";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const user = await requireStaff();
  const classes = await listClassesForStaff(user);
  const showOrg = new Set(classes.map((c) => c.organizationName)).size > 1;

  return (
    <>
      <PageHeader
        title="Classes"
        description="Your active classes. Open one for its roster, mastery heatmap, interventions and engagement."
        actions={
          <ButtonLink href="/teacher/classes/new" icon={<Plus aria-hidden="true" className="size-4" />}>
            New class
          </ButtonLink>
        }
      />
      <DataTable
        caption="Your classes"
        columns={[
          { key: "name", header: "Class", rowHeader: true },
          { key: "course", header: "Course" },
          ...(showOrg ? [{ key: "org", header: "School" }] : []),
          { key: "students", header: "Students", align: "right" as const },
          { key: "code", header: "Join code" },
          { key: "ai", header: "AI tutor" },
          { key: "open", header: <span className="sr-only">Open</span>, align: "right" as const },
        ]}
        rows={classes.map((c) => ({
          id: c.id,
          name: (
            <Link href={classHref(c.id)} className="rounded underline-offset-4 hover:underline">
              {c.name}
            </Link>
          ),
          course: c.courseName,
          org: c.organizationName,
          students: c.studentCount,
          code: <span className="font-mono font-semibold tracking-wider text-ink">{c.joinCode}</span>,
          ai: <Badge tone={c.aiPolicy === "allowed" ? "info" : "neutral"}>{AI_POLICY[c.aiPolicy].label}</Badge>,
          open: (
            <span className="flex justify-end gap-1">
              <ButtonLink href={classHref(c.id, "mastery")} variant="ghost" size="sm">
                Heatmap<span className="sr-only"> for {c.name}</span>
              </ButtonLink>
              <ButtonLink href={classHref(c.id)} variant="secondary" size="sm">
                Open<span className="sr-only"> {c.name}</span>
              </ButtonLink>
            </span>
          ),
        }))}
        empty={
          <EmptyState
            icon={<Users />}
            title="No classes yet"
            description="Create a class to get a join code for your students. Their mastery appears here as soon as they start answering questions."
            action={<ButtonLink href="/teacher/classes/new">Create a class</ButtonLink>}
          />
        }
      />
    </>
  );
}

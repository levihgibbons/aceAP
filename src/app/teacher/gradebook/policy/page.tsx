import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { ClassPicker } from "@/components/assignments/ClassPicker";
import { PolicyEditor } from "@/components/gradebook/PolicyEditor";
import { ButtonLink, EmptyState, ErrorState, PageHeader, formatDate } from "@/components/ui";
import { requireStaff } from "@/modules/auth/session";
import { listClassesForStaff } from "@/modules/classrooms/service";
import { DEFAULT_GRADING_POLICY } from "@/modules/gradebook/policy";
import { listGradingPolicyVersions } from "@/modules/gradebook/service";
import { previewPolicyAction, publishPolicyAction } from "../actions";

export const metadata: Metadata = { title: "Grading policy" };

export default async function GradingPolicyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const params = await searchParams;
  const classParam = typeof params.class === "string" ? params.class : null;
  const classes = await listClassesForStaff(user);
  const cls = classParam ? classes.find((c) => c.id === classParam) : classes[0];

  const header = (
    <PageHeader
      breadcrumbs={[
        {
          label: "Gradebook",
          href: cls ? `/teacher/gradebook?class=${cls.id}` : "/teacher/gradebook",
        },
        { label: "Grading policy" },
      ]}
      eyebrow={cls?.name}
      title="Grading policy"
      description="How mastery and attempts turn into recorded grades for this class. Mastery is what the evidence shows; the grade is what you record. Changing the policy never edits responses or mastery."
    />
  );

  if (classes.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No classes yet"
          description="Each class has its own grading policy."
          action={<ButtonLink href="/teacher/classes">Go to classes</ButtonLink>}
        />
      </>
    );
  }
  const picker = (
    <ClassPicker
      basePath="/teacher/gradebook/policy"
      classes={classes.map((c) => ({ id: c.id, name: c.name, detail: c.courseName }))}
      value={cls?.id ?? null}
    />
  );
  if (!cls) {
    return (
      <>
        {header}
        <div className="mb-6">{picker}</div>
        <ErrorState
          title="Class not available"
          description="That class doesn't exist or isn't one of yours."
          retry={{ href: "/teacher/gradebook/policy", label: "Open my first class" }}
        />
      </>
    );
  }

  const versions = await listGradingPolicyVersions(user, cls.id);
  const active = versions.find((v) => v.isActive) ?? null;
  const creatorIds = [
    ...new Set(versions.map((v) => v.createdBy).filter((x): x is string => Boolean(x))),
  ];
  const creators = creatorIds.length
    ? await (
        await getDb()
      )
        .select({ id: t.users.id, name: t.users.name })
        .from(t.users)
        .where(inArray(t.users.id, creatorIds))
    : [];
  const nameOf = new Map(creators.map((c) => [c.id, c.name]));

  return (
    <>
      {header}
      <div className="mb-6">{picker}</div>
      <PolicyEditor
        key={cls.id}
        classId={cls.id}
        className={cls.name}
        current={active?.config ?? DEFAULT_GRADING_POLICY}
        currentVersion={active?.version ?? 0}
        versions={versions.map((v) => ({
          id: v.id,
          version: v.version,
          config: v.config,
          isActive: v.isActive,
          createdLabel: formatDate(v.createdAt, { withTime: true }),
          createdBy: v.createdBy ? (nameOf.get(v.createdBy) ?? "Staff member") : "System default",
        }))}
        previewAction={previewPolicyAction}
        publishAction={publishPolicyAction}
      />
    </>
  );
}

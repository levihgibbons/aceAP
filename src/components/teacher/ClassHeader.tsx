/**
 * ClassHeader — PageHeader + class facts + section tabs for every
 * /teacher/classes/[classId]/* page.
 *   <ClassHeader ctx={ctx} current="mastery" title="Mastery" description="…" />
 */
import type { ReactNode } from "react";
import { KeyRound, Users } from "lucide-react";
import { PageHeader, Pill, TabLinks } from "@/components/ui";
import { classHref } from "./format";
import { CopyButton } from "./CopyButton";

export type ClassSection = "overview" | "mastery" | "practice" | "interventions" | "engagement" | "assignments" | "gradebook" | "notes" | "settings" | "canvas";

export interface ClassHeaderInfo {
  id: string;
  name: string;
  courseName: string;
  versionLabel: string;
  joinCode: string;
  studentCount: number;
}

export function ClassHeader({
  ctx,
  current,
  title,
  description,
  actions,
}: {
  ctx: ClassHeaderInfo;
  current: ClassSection;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const sectionLabel: Record<ClassSection, string> = {
    overview: "Roster",
    mastery: "Mastery",
    practice: "Lessons & practice",
    interventions: "Interventions",
    engagement: "Engagement",
    assignments: "Assignments",
    gradebook: "Gradebook",
    notes: "Shared notes",
    settings: "Settings",
    canvas: "Canvas roster",
  };
  const breadcrumbs = [{ label: "Classes", href: "/teacher/classes" }, { label: ctx.name, href: classHref(ctx.id) }, ...(current === "overview" ? [] : [{ label: sectionLabel[current] }])];
  return (
    <>
      <PageHeader
        className="mb-5"
        breadcrumbs={breadcrumbs}
        eyebrow={ctx.courseName}
        title={title ?? ctx.name}
        description={description}
        actions={actions}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Pill icon={<KeyRound className="size-3.5" />}>
          Join code <span className="font-mono font-semibold tracking-wider text-ink">{ctx.joinCode}</span>
        </Pill>
        <CopyButton value={ctx.joinCode} label="Copy join code" variant="ghost" />
        <Pill icon={<Users className="size-3.5" />}>
          {ctx.studentCount} student{ctx.studentCount === 1 ? "" : "s"}
        </Pill>
        <Pill>Curriculum: {ctx.versionLabel}</Pill>
      </div>
      <TabLinks
        className="mb-8"
        label="Class sections"
        current={current}
        items={[
          { id: "overview", label: "Roster", href: classHref(ctx.id) },
          { id: "mastery", label: "Mastery", href: classHref(ctx.id, "mastery") },
          { id: "practice", label: "Lessons & practice", href: classHref(ctx.id, "practice") },
          { id: "interventions", label: "Interventions", href: classHref(ctx.id, "interventions") },
          { id: "engagement", label: "Engagement", href: classHref(ctx.id, "engagement") },
          { id: "assignments", label: "Assignments", href: `/teacher/assignments?class=${ctx.id}` },
          { id: "gradebook", label: "Gradebook", href: `/teacher/gradebook?class=${ctx.id}` },
          { id: "notes", label: "Shared notes", href: classHref(ctx.id, "notes") },
          { id: "settings", label: "Settings", href: classHref(ctx.id, "settings") },
        ]}
      />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { EvidencePanel } from "@/components/teacher/EvidencePanel";
import { classHref, firstParam, interventionHref, studentHref } from "@/components/teacher/format";
import { orNotFound } from "@/components/teacher/server/data";
import { buildCellEvidence } from "@/components/teacher/server/evidence";
import { requireStaff } from "@/modules/auth/session";
import { classesSharedWithStudent } from "@/modules/classrooms/analytics";
import { getCourseTree, getSkillCourseId } from "@/modules/curriculum/queries";

export const metadata: Metadata = { title: "Skill evidence" };

function decode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function SkillEvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string; skillId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStaff();
  const { studentId, skillId: rawSkill } = await params;
  const skillId = decode(rawSkill);
  const sp = await searchParams;

  // Authorise: a class of this teacher's that the student is in, for the skill's course.
  const [shared, courseId] = await Promise.all([classesSharedWithStudent(user, studentId), getSkillCourseId(skillId)]);
  const candidates = shared.filter((c) => c.courseId === courseId);
  if (!courseId || candidates.length === 0) notFound();
  const cls = candidates.find((c) => c.classId === firstParam(sp.class)) ?? candidates[0];

  const [evidence, tree] = await Promise.all([orNotFound(buildCellEvidence(user, cls.classId, studentId, skillId)), getCourseTree(courseId)]);
  const objectives = (tree?.skills.get(skillId)?.objectiveIds ?? []).map((id) => tree?.objectives.get(id)).filter((o): o is NonNullable<typeof o> => Boolean(o));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Classes", href: "/teacher/classes" },
          { label: cls.className, href: classHref(cls.classId) },
          { label: cls.studentName, href: studentHref(studentId, cls.classId) },
          { label: evidence.column.label },
        ]}
        eyebrow={`Evidence · ${cls.studentName}`}
        title={evidence.column.label}
        description={
          objectives.length ? (
            <span>
              Part of{" "}
              {objectives.map((o, i) => (
                <span key={o.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={interventionHref(cls.classId, o.id)} className="font-medium text-accent underline-offset-4 hover:underline" title={o.description}>
                    {o.code}
                  </Link>
                </span>
              ))}
              . Every number below comes from graded responses; time on a page never counts.
            </span>
          ) : (
            "Every number below comes from graded responses; time on a page never counts."
          )
        }
      />
      <div className="max-w-3xl">
        <EvidencePanel evidence={evidence} variant="page" />
      </div>
    </>
  );
}

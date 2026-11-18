import type { Metadata } from "next";
import { ButtonLink, Card, CardBody, CardHeader, KeyValue } from "@/components/ui";
import { AiPolicyForm } from "@/components/teacher/AiPolicyForm";
import { ClassHeader } from "@/components/teacher/ClassHeader";
import { classHref } from "@/components/teacher/format";
import { loadClassContext } from "@/components/teacher/server/data";
import { requireStaff } from "@/modules/auth/session";
import { CONTENT_STATUS_LABEL } from "@/modules/curriculum/queries";

export const metadata: Metadata = { title: "Class settings" };

const VERIFICATION: Record<string, string> = {
  outline_from_official_index: "Unit outline taken from the official course index",
  aligned_by_author: "Aligned by AceAP authors",
  unverified: "Not yet verified",
};

export default async function ClassSettingsPage({ params }: { params: Promise<{ classId: string }> }) {
  const user = await requireStaff();
  const { classId } = await params;
  const ctx = await loadClassContext(user, classId);
  const status = CONTENT_STATUS_LABEL[ctx.tree.course.contentStatus];

  return (
    <>
      <ClassHeader ctx={ctx} current="settings" title="Class settings" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card padded={false}>
          <CardHeader
            titleAs="h2"
            title="AI tutor"
            description="Applies to ordinary lessons and practice in this class. Assignments carry their own AI setting, chosen when you create them."
          />
          <CardBody>
            <AiPolicyForm classId={ctx.id} current={ctx.aiPolicy} />
          </CardBody>
        </Card>
        <Card padded={false} className="lg:col-start-1">
          <CardHeader
            titleAs="h2"
            title="Canvas roster"
            description="Compare a linked Canvas course with this class. AceAP only shows proposals — students link their own accounts from Canvas."
          />
          <CardBody>
            <ButtonLink href={classHref(ctx.id, "canvas-roster")} variant="secondary" size="sm">
              Open Canvas roster
            </ButtonLink>
          </CardBody>
        </Card>
        <Card padded={false} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <CardHeader titleAs="h2" title="Curriculum" description="Fixed when the class was created, so mastery stays comparable all year." />
          <CardBody>
            <KeyValue
              items={[
                { label: "Course", value: ctx.courseName },
                { label: "Version", value: ctx.versionLabel },
                { label: "Alignment", value: VERIFICATION[ctx.verificationStatus] ?? ctx.verificationStatus },
                { label: "AceAP content", value: status.label },
                { label: "School", value: ctx.organizationName },
              ]}
            />
            <p className="mt-4 text-xs text-muted">{status.description}</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

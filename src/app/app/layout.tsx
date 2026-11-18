import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { requireStudent } from "@/modules/auth/session";
import { getEnrolledCourses } from "@/modules/learning/overview";

export const metadata: Metadata = {
  title: { default: "Home", template: "%s · AceAP" },
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireStudent();
  const enrolled = await getEnrolledCourses({ id: user.id, role: user.role }, user.id);
  const courses = enrolled.map((c) => ({ id: c.courseId, name: c.name }));
  return (
    <AppShell user={user} area="student" courses={courses}>
      {children}
    </AppShell>
  );
}

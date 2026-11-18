import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { requireStudent } from "@/modules/auth/session";

export const metadata: Metadata = {
  title: { default: "Home", template: "%s · AceAP" },
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireStudent();
  return (
    <AppShell user={user} area="student">
      {children}
    </AppShell>
  );
}

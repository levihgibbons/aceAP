import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { requireStaff } from "@/modules/auth/session";

export const metadata: Metadata = {
  title: { default: "Overview", template: "%s · AceAP for teachers" },
  robots: { index: false, follow: false },
};

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff();
  return (
    <AppShell user={user} area="staff">
      {children}
    </AppShell>
  );
}

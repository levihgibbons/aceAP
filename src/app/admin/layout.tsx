import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { requireRole } from "@/modules/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · AceAP admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("platform_admin");
  return (
    <AppShell user={user} area="admin">
      {children}
    </AppShell>
  );
}

import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountSettings";
import { requireStaff } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireStaff();
  return <AccountSettings user={user} />;
}

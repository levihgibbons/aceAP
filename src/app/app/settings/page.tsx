import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountSettings";
import { requireStudent } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireStudent();
  return <AccountSettings user={user} />;
}

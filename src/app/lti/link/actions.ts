"use server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import { linkIdentity } from "@/modules/integrations/lms/service";
import { deepLinkPickerPath, destinationFor, maybeMapAssignment, verifyPendingLink } from "@/modules/integrations/lms/launchFlow";

/** Explicitly link the LMS account in the signed token to the signed-in AceAP account. */
export async function confirmLink(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/lti/link?token=${token}`)}`);
  let pending: ReturnType<typeof verifyPendingLink> = null;
  try {
    pending = verifyPendingLink(token);
  } catch {
    pending = null;
  }
  if (!pending) redirect("/lti/link?error=expired");
  const result = await linkIdentity(pending.connectionId, pending.userSub, user.id, "lti_launch_signed_in");
  if (!result.ok) redirect(`/lti/link?error=${result.error.code === "conflict" ? "conflict" : "failed"}`);
  // Deep-linking launch: continue to the activity picker (it re-checks the link and the role).
  if (pending.deepLinkToken) redirect(deepLinkPickerPath(pending.deepLinkToken));
  await maybeMapAssignment(user.id, pending);
  redirect(await destinationFor(user.id, user.role, pending));
}

/**
 * GET /api/account/export — download the signed-in user's account basics as
 * JSON (schema `aceap.account-export` 1.0.0). Attachment, never cached.
 * Students' notes and learning record come from /api/vault/export.
 */
import { apiHandler } from "@/lib/api";
import { getAccountExport } from "@/modules/accounts/profile";
import { requireApiUser } from "@/modules/auth/session";

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const data = await getAccountExport(user);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aceap-account-${day}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/**
 * GET /api/vault/export?format=json|markdown — download the student's vault.
 * Attachment, never cached. Contents and exclusions are defined by the vault
 * service (no question text, no other people's data).
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { exportVault } from "@/modules/vault/service";

const format = z.enum(["json", "markdown"], { message: "Choose format=json or format=markdown." });

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("student");
  const fmt = format.parse(req.nextUrl.searchParams.get("format") ?? "json");
  const file = await exportVault(user, fmt);
  return new Response(file.body, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

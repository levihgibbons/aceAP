/**
 * GET /api/teacher/gradebook/export?class=<classId> — the class gradebook as CSV.
 * Staff of the class only (teacher, school admin of its organisation, platform
 * admin); anyone else gets 404 so the class's existence isn't revealed.
 * Fields are formula-injection safe (see csvField in the gradebook service).
 */
import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api";
import { DomainError } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { exportGradebookCsv } from "@/modules/gradebook/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fileName(className: string): string {
  const slug = className
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  return `gradebook-${slug || "class"}-${new Date().toISOString().slice(0, 10)}.csv`;
}

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("teacher", "school_admin", "platform_admin");
  const classId = req.nextUrl.searchParams.get("class") ?? "";
  if (!UUID.test(classId)) throw new DomainError("not_found", "Class not found.");
  // exportGradebookCsv authorises (assertClassStaff) before anything is read.
  const csv = await exportGradebookCsv(user, classId);
  const [cls] = await (
    await getDb()
  )
    .select({ name: t.classes.name })
    .from(t.classes)
    .where(eq(t.classes.id, classId));
  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName(cls?.name ?? "class")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

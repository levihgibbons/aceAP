/**
 * GET /api/vault/graph?courseId=&curriculum=1|0 → VaultGraph
 * The student's knowledge graph (bounded; `truncated` says when nodes were dropped).
 */
import type { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { getGraph } from "@/modules/vault/service";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("student");
  const sp = req.nextUrl.searchParams;
  const courseId = sp.get("courseId") || undefined;
  const includeCurriculum = sp.get("curriculum") !== "0";
  return getGraph(user, { courseId, includeCurriculum });
});

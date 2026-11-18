/**
 * GET /api/vault/link-targets?q=chain          → { notes, skills }   (wiki-link autocomplete)
 * GET /api/vault/link-targets?resolve=A&resolve=B → { resolved }     (live preview link resolution)
 *
 * Notes are the student's own (via listNotes / RLS); skills are shared
 * curriculum names.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { listNotes } from "@/modules/vault/service";
import { resolveTitles, searchSkills } from "../_lib/queries";

const query = z.string().trim().max(200);

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("student");
  const sp = req.nextUrl.searchParams;
  const resolve = sp.getAll("resolve");
  if (resolve.length) {
    const titles = z.array(z.string().max(200)).max(50).parse(resolve);
    return { resolved: await resolveTitles(user, titles) };
  }
  const q = query.parse(sp.get("q") ?? "");
  const [notes, skills] = await Promise.all([
    listNotes(user, { query: q || undefined, limit: 8 }),
    searchSkills(user, q, 8),
  ]);
  return {
    notes: notes.map((n) => ({ id: n.id, title: n.title, folder: n.folder, href: n.href })),
    skills,
  };
});

/**
 * GET  /api/vault/notes?query=&tag=&folder=&limit=  → { notes: NoteSummary[] }
 * POST /api/vault/notes {title, body?, tags?, folder?} → 201 { note: NoteView }  (409 on a title clash)
 *
 * The lesson player posts here from note prompts; the response includes the
 * note's `href` so it can link straight to the editor.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { createNote, listNotes } from "@/modules/vault/service";

const listQuery = z.object({
  query: z.string().trim().max(200).optional(),
  tag: z.string().max(60).optional(),
  folder: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const createBody = z.object({
  title: z.string().max(400),
  body: z.string().optional(),
  tags: z.array(z.string().max(60)).max(50).optional(),
  folder: z.string().max(400).optional(),
});

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("student");
  const sp = req.nextUrl.searchParams;
  const q = listQuery.parse({
    query: sp.get("query") || sp.get("q") || undefined,
    tag: sp.get("tag") || undefined,
    folder: sp.has("folder") ? (sp.get("folder") ?? "") : undefined,
    limit: sp.get("limit") || undefined,
  });
  return { notes: await listNotes(user, q) };
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireApiUser("student");
  const input = await parseJson(req, createBody);
  const note = await createNote(user, input);
  return NextResponse.json(
    { note },
    { status: 201, headers: { "Cache-Control": "no-store", Location: note.href } },
  );
});

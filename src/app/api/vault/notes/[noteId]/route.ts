/**
 * GET    /api/vault/notes/:noteId  → { note, backlinks }
 * PUT    /api/vault/notes/:noteId  {title?, body?, tags?, folder?} → { note }
 * DELETE /api/vault/notes/:noteId  → { deleted: true }
 * Only the owner can reach a note; anyone else gets 404.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { deleteNote, getBacklinks, getNote, updateNote } from "@/modules/vault/service";

type Ctx = { params: Promise<{ noteId: string }> };

const updateBody = z.object({
  title: z.string().max(400).optional(),
  body: z.string().optional(),
  tags: z.array(z.string().max(60)).max(50).optional(),
  folder: z.string().max(400).optional(),
});

export const GET = apiHandler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  const note = await getNote(user, noteId);
  const backlinks = await getBacklinks(user, { type: "note", id: noteId });
  return { note, backlinks };
});

export const PUT = apiHandler<Ctx>(async (req: NextRequest, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  const patch = await parseJson(req, updateBody);
  return { note: await updateNote(user, noteId, patch) };
});

export const DELETE = apiHandler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  return deleteNote(user, noteId);
});

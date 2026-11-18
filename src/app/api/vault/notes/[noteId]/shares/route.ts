/**
 * GET    /api/vault/notes/:noteId/shares            → { shares, classes }
 * POST   /api/vault/notes/:noteId/shares {classId}  → { share }
 * DELETE /api/vault/notes/:noteId/shares {classId}  → { unshared: true }
 * `classes` lists the student's active classes, so the share dialog can offer
 * exactly the classes a note may be shared with.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, parseJson } from "@/lib/api";
import { requireApiUser } from "@/modules/auth/session";
import { listNoteShares, shareNote, unshareNote } from "@/modules/vault/service";
import { getActiveClasses } from "../../../_lib/queries";

type Ctx = { params: Promise<{ noteId: string }> };

const classBody = z.object({ classId: z.string().min(1).max(64) });

export const GET = apiHandler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  const shares = await listNoteShares(user, noteId);
  const classes = await getActiveClasses(user);
  return { shares, classes };
});

export const POST = apiHandler<Ctx>(async (req: NextRequest, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  const { classId } = await parseJson(req, classBody);
  return { share: await shareNote(user, noteId, classId) };
});

export const DELETE = apiHandler<Ctx>(async (req: NextRequest, ctx) => {
  const user = await requireApiUser("student");
  const { noteId } = await ctx.params;
  const { classId } = await parseJson(req, classBody);
  return unshareNote(user, noteId, classId);
});

/** Shared request schemas for the /api/attempts/[attemptId]/* handlers. */
import { z } from "zod";

export interface AttemptRouteContext {
  params: Promise<{ attemptId: string }>;
}

export const questionIdSchema = z.string().min(1).max(200);

export const questionRefSchema = z.object({ questionId: questionIdSchema });

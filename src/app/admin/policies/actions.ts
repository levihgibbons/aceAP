"use server";
/** Publish a new platform-default mastery policy (platform admins only). */
import { refresh } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import {
  failureFrom,
  zodFieldErrors,
  type ActionState,
} from "@/components/assignments/action-state";
import { requireApiUser } from "@/modules/auth/session";
import { DEFAULT_MASTERY_POLICY, masteryPolicySchema } from "@/modules/mastery/policy";
import { publishPolicy } from "@/modules/mastery/service";
import type { MasteryPolicyConfig } from "@/modules/mastery/types";

/** Only level thresholds and minimum-evidence rules are editable here; everything else is kept from the active policy. */
export async function publishMasteryPolicyAction(
  levels: unknown,
  name: unknown,
): Promise<ActionState> {
  let message: string;
  try {
    const user = await requireApiUser("platform_admin");
    const db = await getDb();
    const [active] = await db
      .select()
      .from(t.masteryPolicies)
      .where(and(isNull(t.masteryPolicies.organizationId), eq(t.masteryPolicies.isActive, true)))
      .orderBy(desc(t.masteryPolicies.version))
      .limit(1);
    const base: MasteryPolicyConfig = active?.config ?? DEFAULT_MASTERY_POLICY;
    const candidate = { ...base, levels };
    const parsed = masteryPolicySchema.safeParse(candidate);
    if (!parsed.success)
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Some values are out of range.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    const label =
      typeof name === "string" && name.trim()
        ? name.trim().slice(0, 80)
        : (active?.name ?? "AceAP default");
    const { policy, recalculated } = await publishPolicy(db, {
      organizationId: null,
      name: label,
      config: parsed.data,
      createdBy: user.id,
    });
    message = `Version ${policy.version} is active. ${recalculated} mastery state${recalculated === 1 ? " was" : "s were"} recalculated and new snapshots appended.`;
  } catch (e) {
    return failureFrom(e, "publishMasteryPolicy");
  }
  refresh();
  return { ok: true, message };
}

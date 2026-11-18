"use server";
/**
 * Auth server actions.
 *  - signIn(prev, formData)      useActionState-compatible; fields: email, password, next?
 *  - signUp(prev, formData)      useActionState-compatible; fields: name, email, password, role
 *  - demoSignIn(prev, formData)  useActionState-compatible; field: email (must be an isDemo account)
 *  - signOut()                   plain form action
 * All successful paths create a normal session (startSession) and redirect.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { authenticate, createUser, signInSchema, signUpSchema } from "@/modules/auth/service";
import { endSession, homeFor, startSession } from "@/modules/auth/session";
import { demoAdminLoginAllowed } from "./_components/demo-policy";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "role", string>>;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: { name?: string; email?: string; role?: string };
}

/** Only same-site relative paths are honoured (no absolute or protocol-relative URLs). */
function safeNext(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\\]/.test(raw)) return null;
  try {
    const base = "http://aceap.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: str(formData, "email") };
  const parsed = signInSchema.safeParse({ email: values.email, password: str(formData, "password") });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "email" || key === "password") && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  let destination: string;
  try {
    const user = await authenticate(parsed.data, await clientKey());
    await startSession(user.id);
    destination = safeNext(formData.get("next")) ?? homeFor(user.role);
  } catch (err) {
    if (err instanceof DomainError) return { error: err.message, values };
    console.error("signIn failed", err);
    return { error: "We couldn't sign you in right now. Please try again.", values };
  }
  redirect(destination);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: str(formData, "name"), email: str(formData, "email"), role: str(formData, "role") || "student" };
  const parsed = signUpSchema.safeParse({ ...values, password: str(formData, "password") });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "name" || key === "email" || key === "password" || key === "role") && !fieldErrors[key]) {
        fieldErrors[key] = key === "role" ? "Choose student or teacher." : issue.message;
      }
    }
    return { fieldErrors, values };
  }

  let destination: string;
  try {
    const user = await createUser({
      ...parsed.data,
      createPersonalOrganization: parsed.data.role === "teacher",
    });
    await startSession(user.id);
    destination = homeFor(user.role);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === "conflict") return { fieldErrors: { email: err.message }, values };
      return { error: err.message, values };
    }
    console.error("signUp failed", err);
    return { error: "We couldn't create your account right now. Please try again.", values };
  }
  redirect(destination);
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function demoSignIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (process.env.ACEAP_DEMO_LOGIN === "0") return { error: "Demo sign-in is turned off on this server." };
  const email = str(formData, "email").trim().toLowerCase();
  if (!email || email.length > 200) return { error: "Choose a demo account." };

  let destination: string;
  try {
    const db = await getDb();
    const [user] = await db
      .select({ id: t.users.id, role: t.users.role, isDemo: t.users.isDemo })
      .from(t.users)
      .where(and(sql`lower(${t.users.email}) = ${email}`, sql`${t.users.deletedAt} is null`));
    if (!user) return { error: "Demo data isn't loaded yet — run `npm run db:seed`." };
    // Only seeded fictional accounts can be entered without a password.
    if (!user.isDemo) return { error: "That isn't a demo account. Sign in with a password instead." };
    if (user.role === "platform_admin" && !demoAdminLoginAllowed()) return { error: "The demo admin account can't be entered with one click on this server." };
    await startSession(user.id);
    destination = homeFor(user.role);
  } catch (err) {
    console.error("demoSignIn failed", err);
    return { error: "We couldn't start the demo right now. Please try again." };
  }
  redirect(destination);
}

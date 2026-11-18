/** Cookie-backed session helpers for Server Components, Actions and Route Handlers. */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { createSession, destroySession, getUserBySessionToken, type SessionUser } from "./service";

export const SESSION_COOKIE = "aceap_session";

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure in production. ACEAP_INSECURE_COOKIES exists only so a production
    // build can be exercised over http://localhost in automated tests.
    secure: process.env.NODE_ENV === "production" && process.env.ACEAP_INSECURE_COOKIES !== "1",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request (deduplicated per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return getUserBySessionToken(jar.get(SESSION_COOKIE)?.value);
});

export const isStaffRole = (role: UserRole) => role === "teacher" || role === "school_admin" || role === "platform_admin";
export const homeFor = (role: UserRole) => (role === "platform_admin" ? "/admin" : isStaffRole(role) ? "/teacher" : "/app");

/** For pages: redirect to sign-in when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: additionally send users to their own home if the area isn't theirs. */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const requireStudent = () => requireRole("student");
export const requireStaff = () => requireRole("teacher", "school_admin", "platform_admin");

/** For API routes and actions: throw instead of redirecting. */
export async function requireApiUser(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("unauthenticated", "Sign in to continue.");
  if (roles.length && !roles.includes(user.role)) throw new DomainError("forbidden", "You don't have access to that.");
  return user;
}

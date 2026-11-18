import "server-only";

/**
 * Whether the fictional platform-admin demo account may be entered with one
 * click. Allowed in development; in a production build (a public deployment)
 * only when ACEAP_DEMO_ADMIN_LOGIN=1, because anyone on the internet could
 * otherwise act as a platform administrator. On a public deployment seed the
 * admin with SEED_ADMIN_PASSWORD instead (scripts/seed.ts), which also makes
 * it a non-demo account that needs that password.
 */
export function demoAdminLoginAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ACEAP_DEMO_ADMIN_LOGIN === "1";
}

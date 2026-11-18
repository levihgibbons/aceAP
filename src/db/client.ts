/**
 * Database access.
 *
 *  - DATABASE_URL set   → node-postgres pool (PostgreSQL / Supabase).
 *  - DATABASE_URL unset → embedded Postgres (PGlite) persisted in ACEAP_DATA_DIR,
 *                         or fully in memory when ACEAP_DATA_DIR is "memory".
 *
 * Both run the same schema, migrations and row-level-security policies.
 *
 * Two ways to query:
 *  - `getDb()`           — the trusted application role. Used by domain services
 *                          that have already authorised the caller (grading,
 *                          mastery recalculation, seeding).
 *  - `asUser(user, fn)`  — runs `fn` in a transaction as the restricted
 *                          `aceap_app` role with the caller's identity bound,
 *                          so PostgreSQL row-level security decides what is
 *                          visible. All reads of student-private data go here.
 */
import path from "node:path";
import fs from "node:fs";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

interface Handle {
  db: Db;
  kind: "pglite" | "postgres";
  migrate(folder: string): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");

async function open(): Promise<Handle> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 10 });
    const db = drizzle(pool, { schema });
    return {
      db: db as unknown as Db,
      kind: "postgres",
      migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.ACEAP_DATA_DIR?.trim() || ".data/pglite";
  let client;
  if (dir === "memory") client = new PGlite();
  else {
    const abs = path.resolve(process.cwd(), dir);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    client = new PGlite(abs);
  }
  await client.waitReady;
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Db,
    kind: "pglite",
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    close: () => client.close(),
  };
}

// One handle per process, surviving dev-server hot reloads.
const globalStore = globalThis as unknown as { __aceapDb?: Promise<Handle> };

async function handle(): Promise<Handle> {
  if (!globalStore.__aceapDb) {
    globalStore.__aceapDb = (async () => {
      const h = await open();
      // Embedded databases migrate themselves on first open; a real PostgreSQL
      // server is migrated explicitly with `npm run db:migrate`.
      if (h.kind === "pglite") await h.migrate(MIGRATIONS_DIR);
      return h;
    })();
    globalStore.__aceapDb.catch(() => {
      globalStore.__aceapDb = undefined;
    });
  }
  return globalStore.__aceapDb;
}

export async function getDb(): Promise<Db> {
  return (await handle()).db;
}

export async function migrateDatabase(): Promise<void> {
  await (await handle()).migrate(MIGRATIONS_DIR);
}

export async function closeDatabase(): Promise<void> {
  if (!globalStore.__aceapDb) return;
  const h = await globalStore.__aceapDb;
  globalStore.__aceapDb = undefined;
  await h.close();
}

export interface Actor {
  id: string;
  role: schema.UserRole;
}

/**
 * Run `fn` with PostgreSQL row-level security enforced for `actor`.
 * `set_config(..., true)` and `SET LOCAL ROLE` are transaction-scoped, so the
 * identity can never leak to another request sharing the connection.
 */
export async function asUser<T>(actor: Actor, fn: (tx: Db) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${actor.id}, true), set_config('app.user_role', ${actor.role}, true)`,
    );
    await tx.execute(sql`set local role aceap_app`);
    return fn(tx as unknown as Db);
  });
}

export { schema };

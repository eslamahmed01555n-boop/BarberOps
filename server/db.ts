import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.PG_POOL_MAX ?? 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to initialize PostgreSQL:", error);
      pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function checkDbReady() {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute("select 1");
    return true;
  } catch (error) {
    console.warn("[Database] Readiness check failed:", error);
    return false;
  }
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    _db = null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function loadOpsState(): Promise<unknown | null> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.execute(sql`
    SELECT state
    FROM barberops_state
    WHERE tenant_id = 'demo-tenant' AND branch_id = 'main-branch'
    LIMIT 1
  `);
  const row = (result as unknown as { rows?: Array<{ state?: unknown }> }).rows?.[0];
  return row?.state ?? null;
}

export async function saveOpsState(state: unknown): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.execute(sql`
    INSERT INTO barberops_state (tenant_id, branch_id, state, revision, updated_at)
    VALUES ('demo-tenant', 'main-branch', ${JSON.stringify(state)}::jsonb, 1, NOW())
    ON CONFLICT (tenant_id, branch_id)
    DO UPDATE SET state = EXCLUDED.state, revision = barberops_state.revision + 1, updated_at = NOW()
  `);
}

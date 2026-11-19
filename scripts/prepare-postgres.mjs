import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('user', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      open_id VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      login_method VARCHAR(64),
      role user_role NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS barbers (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      specialty TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chairs (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      barber_id TEXT REFERENCES barbers(id) ON DELETE SET NULL,
      chair_id TEXT REFERENCES chairs(id) ON DELETE SET NULL,
      service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
      scheduled_start TIMESTAMPTZ NOT NULL,
      scheduled_end TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS queue_entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      arrived_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      queue_id TEXT REFERENCES queue_entries(id) ON DELETE SET NULL,
      actor TEXT NOT NULL,
      event_type TEXT NOT NULL,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      tone TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS barberops_state (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      state JSONB NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, branch_id)
    );
    CREATE INDEX IF NOT EXISTS bookings_branch_schedule_idx ON bookings (branch_id, scheduled_start);
    CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (branch_id, status);
    CREATE INDEX IF NOT EXISTS queue_entries_status_idx ON queue_entries (branch_id, status, arrived_at);
    CREATE INDEX IF NOT EXISTS audit_events_branch_time_idx ON audit_events (branch_id, occurred_at DESC);
    INSERT INTO tenants (id, name) VALUES ('demo-tenant', 'BarberOps Demo Tenant') ON CONFLICT (id) DO NOTHING;
    INSERT INTO branches (id, tenant_id, name) VALUES ('main-branch', 'demo-tenant', 'الفرع الرئيسي') ON CONFLICT (id) DO NOTHING;
  `);
  await client.query("COMMIT");
  console.log("PostgreSQL preparation completed safely.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

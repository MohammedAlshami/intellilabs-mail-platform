import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({ url: "file:data.db" });
const db = drizzle(client, { schema });

// Create tables
client.execute(`
  CREATE TABLE IF NOT EXISTS websites (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    name TEXT DEFAULT '',
    category TEXT DEFAULT '',
    is_healthcare INTEGER DEFAULT 0,
    emails TEXT DEFAULT '',
    phones TEXT DEFAULT '',
    description TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    services TEXT DEFAULT '[]',
    scrape_status TEXT DEFAULT 'idle',
    created_at TEXT NOT NULL
  )
`);
client.execute(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )
`);
client.execute(`
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    permissions TEXT DEFAULT '[]',
    is_leader INTEGER DEFAULT 0,
    leads_roles TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  )
`);

// Seed data (async, fire-and-forget)
async function seed() {
  // Seed roles
  const existingRoles = await client.execute("SELECT COUNT(*) as cnt FROM roles");
  const roleRow = existingRoles.rows[0] as any;
  if (Number(roleRow?.cnt ?? 0) === 0) {
    const seedRoles = [
      { id: '1', name: 'Admin', description: 'Full access to all features', permissions: JSON.stringify(["view_dashboard","manage_campaigns","manage_websites","manage_users","manage_roles","export_data","view_audit","manage_settings","view_reports","manage_leads","manage_removal_list","send_emails"]), is_leader: 1, leads_roles: JSON.stringify(["Manager","Viewer"]), created_at: '2026-06-01T00:00:00' },
      { id: '2', name: 'Manager', description: 'Can manage campaigns and view most data', permissions: JSON.stringify(["view_dashboard","manage_campaigns","view_websites","manage_leads","export_data","view_audit","view_reports","send_emails","manage_removal_list"]), is_leader: 1, leads_roles: JSON.stringify(["Viewer"]), created_at: '2026-06-01T00:00:00' },
      { id: '3', name: 'Viewer', description: 'Read-only access to dashboards and reports', permissions: JSON.stringify(["view_dashboard","view_campaigns","view_websites","view_leads","view_reports","view_audit"]), is_leader: 0, leads_roles: JSON.stringify([]), created_at: '2026-06-01T00:00:00' },
    ];
    for (const r of seedRoles) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO roles (id, name, description, permissions, is_leader, leads_roles, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [r.id, r.name, r.description, r.permissions, r.is_leader, r.leads_roles, r.created_at],
      });
    }
  }

  // Seed audit logs
  const existingLogs = await client.execute("SELECT COUNT(*) as cnt FROM audit_logs");
  const logRow = existingLogs.rows[0] as any;
  if (Number(logRow?.cnt ?? 0) === 0) {
    const actions = ["Created campaign 'Q3 Newsletter'", "Extracted 23 emails from ijo-bs.com", "Added 5 items to removal list", "Exported removal list as CSV", "Updated website brightcaremedical.com", "Sent campaign 'Welcome Series' to 450 recipients", "Logged in from new device", "Changed role permissions for Manager", "Exported report as XLSX", "Deleted campaign 'Test Campaign'"];
    const entities = ["campaign", "website", "removal_list", "report", "user", "role"];
    for (let i = 0; i < 25; i++) {
      const d = new Date("2026-06-10");
      d.setHours(d.getHours() - i * 3);
      await client.execute({
        sql: `INSERT OR IGNORE INTO audit_logs (id, action, entity_type, entity_id, user_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [String(i + 1), actions[i % actions.length], entities[i % entities.length], String(i + 100), "admin@intellilabs.com", JSON.stringify({ description: `Auto-generated audit entry ${i + 1}` }), d.toISOString()],
      });
    }
  }
}
seed();

export { db, client };

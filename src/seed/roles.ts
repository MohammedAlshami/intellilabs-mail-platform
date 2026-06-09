import { getDb } from "@/db";
import { roles } from "@/db/schema";

export async function seedRoles() {
  const db = await getDb();
  const existing = await db.select().from(roles);
  if (existing.length > 0) return;

  const data = [
    { id: '1', name: 'Admin', description: 'Full access to all features', permissions: ["view_dashboard","manage_campaigns","manage_websites","manage_users","manage_roles","export_data","view_audit","manage_settings","view_reports","manage_leads","manage_removal_list","send_emails"], isLeader: true, leadsRoles: ["Manager","Viewer"], createdAt: '2026-06-01T00:00:00' },
    { id: '2', name: 'Manager', description: 'Can manage campaigns and view most data', permissions: ["view_dashboard","manage_campaigns","view_websites","manage_leads","export_data","view_audit","view_reports","send_emails","manage_removal_list"], isLeader: true, leadsRoles: ["Viewer"], createdAt: '2026-06-01T00:00:00' },
    { id: '3', name: 'Viewer', description: 'Read-only access to dashboards and reports', permissions: ["view_dashboard","view_campaigns","view_websites","view_leads","view_reports","view_audit"], isLeader: false, leadsRoles: [], createdAt: '2026-06-01T00:00:00' },
  ];

  for (const r of data) {
    await db.insert(roles).values({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: JSON.stringify(r.permissions),
      isLeader: r.isLeader,
      leadsRoles: JSON.stringify(r.leadsRoles),
      createdAt: r.createdAt,
    });
  }
  console.log(`Seeded ${data.length} roles`);
}

import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { ALL_PAGES, ALL_PERMISSIONS, type Permission, type PagePermissions } from "@/lib/permissions";

function allPerms(val: boolean): Record<Permission, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map(p => [p, val])) as Record<Permission, boolean>;
}

function makePagePermissions(overrides: Partial<Record<string, Partial<Record<string, boolean>>>>): PagePermissions {
  const result: PagePermissions = {};
  for (const page of ALL_PAGES) {
    result[page] = { ...allPerms(false), ...(overrides[page] || {}) };
  }
  return result;
}

export async function seedRoles() {
  const db = await getDb();
  const existing = await db.select().from(roles);
  if (existing.length > 0) return;

  const adminPerms = makePagePermissions(
    Object.fromEntries(ALL_PAGES.map(p => [p, { view: true, create: true, edit: true, delete: true, export: true }]))
  );
  const managerPerms = makePagePermissions({
    dashboard: { view: true, export: true },
    mail: { view: true, create: true, edit: true, delete: true, export: true },
    campaigns: { view: true, create: true, edit: true, delete: true, export: true },
    "email-lists": { view: true, create: true, edit: true, delete: true, export: true },
    "sending-history": { view: true, export: true },
    "bounce-monitor": { view: true, edit: true, export: true },
    templates: { view: true, create: true, edit: true, delete: true },
    websites: { view: true, create: true, edit: true, delete: true, export: true },
    leads: { view: true, create: true, edit: true, delete: true, export: true },
    "removal-list": { view: true, create: true, edit: true, delete: true, export: true },
    profile: { view: true, edit: true },
  });
  const viewerPerms = makePagePermissions({
    dashboard: { view: true },
    mail: { view: true },
    campaigns: { view: true },
    "email-lists": { view: true },
    "sending-history": { view: true },
    "bounce-monitor": { view: true },
    templates: { view: true },
    websites: { view: true },
    leads: { view: true },
    "removal-list": { view: true },
    profile: { view: true, edit: true },
  });

  const data = [
    { id: '1', name: 'Admin', description: 'Full access to all features', permissions: adminPerms, isLeader: true, leadsRoles: ["Manager","Viewer"], createdAt: '2026-06-01T00:00:00' },
    { id: '2', name: 'Manager', description: 'Can manage campaigns, send emails, and manage data', permissions: managerPerms, isLeader: true, leadsRoles: ["Viewer"], createdAt: '2026-06-01T00:00:00' },
    { id: '3', name: 'Viewer', description: 'Read-only access to dashboards and reports', permissions: viewerPerms, isLeader: false, leadsRoles: [], createdAt: '2026-06-01T00:00:00' },
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

import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export async function seedAuditLogs() {
  const db = await getDb();
  const existing = await db.select().from(auditLogs);
  if (existing.length > 0) return;

  const actions = [
    "Created campaign 'Q3 Newsletter'", "Extracted 23 emails from ijo-bs.com",
    "Added 5 items to removal list", "Exported removal list as CSV",
    "Updated website brightcaremedical.com", "Sent campaign 'Welcome Series' to 450 recipients",
    "Logged in from new device", "Changed role permissions for Manager",
    "Exported report as XLSX", "Deleted campaign 'Test Campaign'",
  ];
  const entities = ["campaign", "website", "removal_list", "report", "user", "role"];
  const userIds = ["admin@intellilabs.com", "manager@intellilabs.com", "viewer@intellilabs.com"];

  for (let i = 0; i < 25; i++) {
    const d = new Date("2026-06-10");
    d.setHours(d.getHours() - i * 3);
    await db.insert(auditLogs).values({
      id: String(i + 1),
      action: actions[i % actions.length],
      entityType: entities[i % entities.length],
      entityId: String(i + 100),
      userId: userIds[i % userIds.length],
      details: JSON.stringify({ description: `Auto-generated audit entry ${i + 1}` }),
      createdAt: d.toISOString(),
    });
  }
  console.log("Seeded 25 audit logs");
}

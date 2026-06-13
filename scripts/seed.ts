import { drizzle } from "drizzle-orm/d1";
import * as schema from "../src/db/schema";
import { ALL_PAGES, ALL_PERMISSIONS, type Permission, type PagePermissions } from "../src/lib/permissions";
import bcrypt from "bcryptjs";

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

const CF_API = "https://api.cloudflare.com/client/v4";

async function query(sql: string, params: any[] = []): Promise<any> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  if (!accountId || !databaseId || !token) throw new Error("Missing CLOUDFLARE env vars");
  const res = await fetch(`${CF_API}/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const data: any = await res.json();
  if (!data.success) throw new Error(`D1 API error: ${JSON.stringify(data.errors)}`);
  return data.result;
}

async function exec(sql: string) { await query(sql); }

class RawD1 {
  prepare(sql: string) { return new RawStmt(sql); }
  async exec(sql: string) { await query(sql); return { count: 0, duration: 0 }; }
  batch(s: any[]) { return s.map((s: any) => s._run()); }
}

class RawStmt {
  private sql: string; private _values: any[] = [];
  constructor(sql: string) { this.sql = sql; }
  bind(...v: any[]) { this._values = v; return this; }
  raw() { return this; }
  async all() { return { results: (await query(this.sql, this._values))[0]?.results || [] }; }
  async run() { await query(this.sql, this._values); return { success: true }; }
  _run() { return this.run(); }
}

const d1 = new RawD1();
const db = drizzle(d1 as any, { schema });

async function main() {
  console.log("Wiping all tables...");
  for (const t of ["sending_history", "removal_list", "bounce_responses", "leads", "campaigns", "roles", "audit_logs", "websites"]) {
    await exec(`DROP TABLE IF EXISTS ${t}`);
  }
  await exec("DROP TABLE IF EXISTS users");
  await exec("DROP TABLE IF EXISTS email_lists");
  await exec("DROP TABLE IF EXISTS campaign_recipients");

  console.log("Creating tables...");
  const tables = [
    `CREATE TABLE websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', created_at TEXT NOT NULL)`,
    `CREATE TABLE audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`,
    `CREATE TABLE roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`,
    `CREATE TABLE campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, objective TEXT DEFAULT '', email_content TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', created_at TEXT NOT NULL)`,
    `CREATE TABLE leads (id TEXT PRIMARY KEY, website_id TEXT NOT NULL, website_name TEXT DEFAULT '', type TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE bounce_responses (id TEXT PRIMARY KEY, email TEXT NOT NULL, type TEXT NOT NULL, reason TEXT DEFAULT '', confidence REAL DEFAULT 0, received TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`,
    `CREATE TABLE removal_list (id TEXT PRIMARY KEY, email TEXT NOT NULL, source TEXT DEFAULT '', reason TEXT DEFAULT '', flagged_at TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`,
    `CREATE TABLE sending_history (id TEXT PRIMARY KEY, campaign TEXT NOT NULL, campaign_id TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, date TEXT NOT NULL, status TEXT DEFAULT 'sent', created_at TEXT NOT NULL)`,
    `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT DEFAULT '', role_id TEXT DEFAULT '', created_at TEXT NOT NULL)`,
    `CREATE TABLE email_lists (id TEXT PRIMARY KEY, name TEXT NOT NULL, emails TEXT NOT NULL, count INTEGER DEFAULT 0, source TEXT DEFAULT '', created_at TEXT NOT NULL)`,
    `CREATE TABLE campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, email TEXT NOT NULL, status TEXT DEFAULT 'sent', responded INTEGER DEFAULT 0, sentiment TEXT DEFAULT '', response_text TEXT DEFAULT '', sent_at TEXT DEFAULT '')`,
  ];
  for (const t of tables) await exec(t);

  console.log("Seeding roles...");
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
  const roleData = [
    { id: '1', name: 'Admin', description: 'Full access to all features', permissions: adminPerms, isLeader: true, leadsRoles: ["Manager","Viewer"] },
    { id: '2', name: 'Manager', description: 'Can manage campaigns, send emails, and manage data', permissions: managerPerms, isLeader: true, leadsRoles: ["Viewer"] },
    { id: '3', name: 'Viewer', description: 'Read-only access to dashboards and reports', permissions: viewerPerms, isLeader: false, leadsRoles: [] },
  ];
  for (const r of roleData) {
    await db.insert(schema.roles).values({ id: r.id, name: r.name, description: r.description, permissions: JSON.stringify(r.permissions), isLeader: r.isLeader, leadsRoles: JSON.stringify(r.leadsRoles), createdAt: '2026-06-01T00:00:00' });
  }
  console.log(`  Inserted ${roleData.length} roles`);

  console.log("Seeding users...");
  const userData = [
    { email: "admin@intellilabs.com", password: "admin123", name: "Admin User", roleId: "1" },
    { email: "manager@intellilabs.com", password: "manager123", name: "Manager User", roleId: "2" },
    { email: "viewer@intellilabs.com", password: "viewer123", name: "Viewer User", roleId: "3" },
    { email: "ahmad@demo-project-mail.xyz", password: "ahmad123", name: "Ahmad", roleId: "1" },
    { email: "siti@demo-project-mail.xyz", password: "siti123", name: "Siti", roleId: "2" },
    { email: "ryan@demo-project-mail.xyz", password: "ryan123", name: "Ryan", roleId: "2" },
    { email: "nurul@demo-project-mail.xyz", password: "nurul123", name: "Nurul", roleId: "3" },
    { email: "david@demo-project-mail.xyz", password: "david123", name: "David", roleId: "3" },
  ];
  for (const u of userData) {
    const hash = await bcrypt.hash(u.password, 10);
    await exec(`INSERT INTO users (id, email, password_hash, name, role_id, created_at) VALUES ('${String(Date.now() + Math.random())}', '${u.email}', '${hash}', '${u.name}', '${u.roleId}', '${new Date().toISOString()}')`);
  }
  console.log(`  Inserted ${userData.length} users`);

  console.log("Seeding websites...");
  const websiteData = [
    { url: "https://brightcaremedical.com", name: "Bright Care Medical", category: "Healthcare", isHealthcare: true, emails: "info@brightcaremedical.com", phones: "+1 (555) 123-4567", description: "A multi-specialty healthcare clinic serving the community with primary care, urgent care, and telehealth services.", summary: "Healthcare provider", services: '["primary care", "urgent care", "telehealth"]' },
    { url: "https://greenvalleydental.com", name: "Green Valley Dental", category: "Dental", isHealthcare: true, emails: "appointments@greenvalleydental.com", phones: "+1 (555) 234-5678", description: "Family and cosmetic dentistry", summary: "Dental practice", services: '["general dentistry", "cosmetic dentistry"]' },
    { url: "https://techsolutions.io", name: "Tech Solutions Inc", category: "Technology", emails: "contact@techsolutions.io, sales@techsolutions.io", phones: "+1 (555) 345-6789", description: "B2B SaaS company providing enterprise software solutions.", summary: "Enterprise software", services: '["CRM platform", "analytics", "consulting"]' },
    { url: "https://oakwoodrealty.com", name: "Oakwood Realty", category: "Real Estate", emails: "listings@oakwoodrealty.com", phones: "+1 (555) 456-7890", description: "Full-service real estate agency", summary: "Real estate agency", services: '["residential sales", "property management"]' },
    { url: "https://primephysio.com", name: "Prime Physiotherapy", category: "Healthcare", isHealthcare: true, emails: "care@primephysio.com", phones: "+1 (555) 567-8901", description: "Physiotherapy and rehabilitation center", summary: "Rehab center", services: '["physiotherapy", "sports rehab"]' },
    { url: "https://horizonfin.com", name: "Horizon Financial", category: "Finance", emails: "support@horizonfin.com, info@horizonfin.com", phones: "+1 (555) 678-9012", description: "Financial advisory and investment management", summary: "Financial services", services: '["investment management", "financial planning"]' },
  ];
  for (const w of websiteData) {
    await db.insert(schema.websites).values({ id: String(Date.now() + Math.random()), url: w.url, name: w.name, category: w.category || '', isHealthcare: w.isHealthcare ?? false, emails: w.emails || '', phones: w.phones || '', description: w.description || '', summary: w.summary || '', services: w.services || '[]', scrapeStatus: "done", createdAt: new Date().toISOString() });
  }
  console.log(`  Inserted ${websiteData.length} websites`);

  console.log("Seeding leads...");
  const wsResult = await query("SELECT * FROM websites");
  const wsList = wsResult[0]?.results || [];
  const leadsData: any[] = [];
  for (const ws of wsList) {
    const emailList = (ws.emails || '').split(',').map((e: string) => e.trim()).filter(Boolean);
    const phoneList = (ws.phones || '').split(',').map((p: string) => p.trim()).filter(Boolean);
    for (const email of emailList) leadsData.push({ websiteId: ws.id, websiteName: ws.name, type: 'email', value: email });
    for (const phone of phoneList) leadsData.push({ websiteId: ws.id, websiteName: ws.name, type: 'phone', value: phone });
  }
  for (const l of leadsData) {
    await db.insert(schema.leads).values({ id: String(Date.now() + Math.random()), websiteId: l.websiteId, websiteName: l.websiteName, type: l.type, value: l.value, createdAt: new Date().toISOString() });
  }
  console.log(`  Inserted ${leadsData.length} leads`);

  console.log("Seeding campaigns...");
  const campaignData = [
    { name: "Q3 Newsletter", subject: "Your Q3 Update", objective: "Update subscribers on Q3 developments and new features", emailContent: "Hi there,\n\nWe're excited to share our Q3 update with you.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 95, bounced: 5, status: "sent" },
    { name: "Welcome Series", subject: "Welcome to our platform", objective: "Onboard new users and introduce core features", emailContent: "Welcome aboard!\n\nWe're thrilled to have you.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 98, bounced: 2, status: "sent" },
    { name: "Holiday Promotion", subject: "Exclusive holiday deals inside", objective: "Promote holiday season special offers", emailContent: "Happy Holidays!\n\nCheck out our exclusive deals.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 97, bounced: 3, status: "sent" },
    { name: "Product Launch", subject: "Introducing our new feature", objective: "Announce the new AI-powered analytics dashboard", emailContent: "We're proud to introduce our newest feature.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 0, bounced: 0, status: "draft" },
  ];
  for (const c of campaignData) {
    await exec(`INSERT INTO campaigns (id, name, subject, objective, email_content, recipients, sent, bounced, status, created_at) VALUES ('${String(Date.now() + Math.random())}', '${c.name}', '${c.subject}', '${c.objective}', '${c.emailContent.replace(/'/g, "''")}', ${c.recipients}, ${c.sent}, ${c.bounced}, '${c.status}', '${new Date().toISOString()}')`);
  }
  console.log(`  Inserted ${campaignData.length} campaigns`);

  console.log("Seeding campaign recipients...");
  const allCampaigns = (await query("SELECT id, name, recipients FROM campaigns"))[0]?.results || [];
  const statuses = ["sent", "sent", "sent", "sent", "sent", "sent", "sent", "bounced", "responded", "responded"];
  const sentiments = ["", "", "", "", "interested", "rejected", "neutral", "", "", ""];
  const responses = ["Thanks for the update! I'm interested in learning more about your services.", "This looks great! When can we schedule a demo?", "Not interested at this time, please remove me from your list.", "", "", "", "", "", "", ""];
  for (const c of allCampaigns) {
    const count = Math.min(c.recipients || 100, 1200);
    for (let i = 0; i < count; i++) {
      const email = `user${i}@example.com`;
      const status = statuses[i % statuses.length];
      const responded = status === "responded" ? 1 : 0;
      const sentiment = responded ? sentiments[i % sentiments.length] : "";
      const responseText = responded ? responses[i % responses.length] : "";

      await exec(`INSERT INTO campaign_recipients (id, campaign_id, email, status, responded, sentiment, response_text, sent_at) VALUES ('${String(Date.now() + Math.random())}', '${c.id}', '${email}', '${status}', ${responded}, '${sentiment}', '${responseText.replace(/'/g, "''")}', '${new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()}')`);
    }
  }
  console.log(`  Inserted recipients for ${allCampaigns.length} campaigns`);

  console.log("Seeding bounce responses...");
  const bounceData = [
    { email: "bounce@example.com", type: "bounce", reason: "Mailbox full", confidence: 0.95, status: "pending" },
    { email: "invalid@test.com", type: "bounce", reason: "Invalid email address", confidence: 0.99, status: "pending" },
    { email: "autoreply@company.com", type: "auto-reply", reason: "Out of office", confidence: 0.88, status: "resolved" },
    { email: "spam@complaint.com", type: "bounce", reason: "Spam complaint", confidence: 0.92, status: "pending" },
    { email: "vacation@domain.com", type: "auto-reply", reason: "On vacation until July", confidence: 0.85, status: "resolved" },
  ];
  for (const b of bounceData) {
    await db.insert(schema.bounceResponses).values({ id: String(Date.now() + Math.random()), email: b.email, type: b.type, reason: b.reason, confidence: b.confidence, received: new Date().toISOString(), status: b.status, createdAt: new Date().toISOString() });
  }
  console.log(`  Inserted ${bounceData.length} bounce responses`);

  console.log("Seeding removal list...");
  const removalData = [
    { email: "bounce@example.com", source: "Q3 Newsletter", reason: "Hard Bounce", status: "pending" },
    { email: "unsub@test.com", source: "Welcome Series", reason: "Unsubscribed", status: "pending" },
    { email: "spam@complaint.com", source: "Holiday Promotion", reason: "Spam Complaint", status: "removed" },
    { email: "invalid@domain.com", source: "Manual entry", reason: "Invalid Email", status: "pending" },
    { email: "left@company.com", source: "Bright Care Medical", reason: "Resigned / Left Company", status: "pending" },
  ];
  for (const r of removalData) {
    await db.insert(schema.removalList).values({ id: String(Date.now() + Math.random()), email: r.email, source: r.source, reason: r.reason, flaggedAt: new Date().toISOString(), status: r.status, createdAt: new Date().toISOString() });
  }
  console.log(`  Inserted ${removalData.length} removal list items`);

  console.log("Seeding sending history...");
  const historyData = [
    { campaign: "Q3 Newsletter", campaign_id: "camp-001", recipients: 1200, sent: 1180, bounced: 20, status: "completed" },
    { campaign: "Welcome Series", campaign_id: "camp-002", recipients: 450, sent: 445, bounced: 5, status: "completed" },
    { campaign: "Holiday Promotion", campaign_id: "camp-003", recipients: 2000, sent: 1980, bounced: 20, status: "completed" },
    { campaign: "john@example.com", campaign_id: "single-001", recipients: 1, sent: 1, bounced: 0, status: "completed" },
    { campaign: "jane@company.com", campaign_id: "single-002", recipients: 1, sent: 1, bounced: 0, status: "completed" },
    { campaign: "bob@test.com", campaign_id: "single-003", recipients: 1, sent: 0, bounced: 1, status: "failed" },
    { campaign: "alice@domain.com", campaign_id: "single-004", recipients: 1, sent: 1, bounced: 0, status: "completed" },
  ];
  for (const h of historyData) {
    await exec(`INSERT INTO sending_history (id, campaign, campaign_id, recipients, sent, bounced, date, status, created_at) VALUES ('${String(Date.now() + Math.random())}', '${h.campaign}', '${h.campaign_id}', ${h.recipients}, ${h.sent}, ${h.bounced}, '${new Date().toISOString()}', '${h.status}', '${new Date().toISOString()}')`);
  }
  console.log(`  Inserted ${historyData.length} sending history entries`);

  console.log("Seeding email lists...");
  const emailListData = [
    { name: "Q3 Newsletter Subscribers", emails: "john@example.com, jane@company.com, bob@test.com, alice@domain.com, carol@site.org", source: "Manual upload" },
    { name: "Healthcare Leads", emails: "info@brightcaremedical.com, appointments@greenvalleydental.com, care@primephysio.com", source: "brightcaremedical.com" },
    { name: "Bounced Emails", emails: "bounce@example.com, invalid@test.com, spam@complaint.com", source: "System auto-collected" },
    { name: "Tech Solutions Contacts", emails: "contact@techsolutions.io, sales@techsolutions.io", source: "techsolutions.io" },
    { name: "Real Estate Prospects", emails: "listings@oakwoodrealty.com", source: "oakwoodrealty.com" },
    { name: "Financial Advisors", emails: "support@horizonfin.com, info@horizonfin.com", source: "horizonfin.com" },
  ];
  for (const el of emailListData) {
    await exec(`INSERT INTO email_lists (id, name, emails, count, source, created_at) VALUES ('${String(Date.now() + Math.random())}', '${el.name}', '${el.emails}', ${el.emails.split(",").length}, '${el.source}', '${new Date().toISOString()}')`);
  }
  console.log(`  Inserted ${emailListData.length} email lists`);

  console.log("Seeding audit logs...");
  const actions = [
    "Created campaign 'Q3 Newsletter'", "Extracted 23 emails from brightcaremedical.com",
    "Added 5 items to removal list", "Exported removal list as CSV",
    "Updated website brightcaremedical.com", "Sent campaign 'Welcome Series' to 450 recipients",
    "Logged in from new device", "Changed role permissions for Manager",
    "Exported report as XLSX", "Deleted campaign 'Test Campaign'",
  ];
  const entities = ["campaign", "website", "removal_list", "report", "user", "role"];
  const userIds = ["admin@intellilabs.com", "manager@intellilabs.com", "viewer@intellilabs.com"];
  for (let i = 0; i < 25; i++) {
    const d = new Date("2026-06-10"); d.setHours(d.getHours() - i * 3);
    await db.insert(schema.auditLogs).values({ id: String(i + 1), action: actions[i % actions.length], entityType: entities[i % entities.length], entityId: String(i + 100), userId: userIds[i % userIds.length], details: JSON.stringify({ description: `Auto-generated audit entry ${i + 1}` }), createdAt: d.toISOString() });
  }
  console.log(`  Inserted 25 audit logs`);

  console.log("Seed complete!");
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); });

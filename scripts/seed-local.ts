import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "app.db");
const sqlite = new Database(DB_PATH);

// Create tables
const TABLES = [
  `CREATE TABLE IF NOT EXISTS websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT DEFAULT '', role_id TEXT DEFAULT '', signature_id TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_signatures (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT DEFAULT '', is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_analysis (id TEXT PRIMARY KEY, email_id TEXT NOT NULL, sentiment TEXT DEFAULT '', reasoning TEXT DEFAULT '', suggested_reply TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_lists (id TEXT PRIMARY KEY, name TEXT NOT NULL, emails TEXT NOT NULL, count INTEGER DEFAULT 0, source TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, email TEXT NOT NULL, status TEXT DEFAULT 'sent', responded INTEGER DEFAULT 0, sentiment TEXT DEFAULT '', response_text TEXT DEFAULT '', sent_at TEXT DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, objective TEXT DEFAULT '', email_content TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, website_id TEXT NOT NULL, website_name TEXT DEFAULT '', type TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bounce_responses (id TEXT PRIMARY KEY, email TEXT NOT NULL, type TEXT NOT NULL, reason TEXT DEFAULT '', confidence REAL DEFAULT 0, received TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS removal_list (id TEXT PRIMARY KEY, email TEXT NOT NULL, source TEXT DEFAULT '', reason TEXT DEFAULT '', flagged_at TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sending_history (id TEXT PRIMARY KEY, campaign TEXT NOT NULL, campaign_id TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, date TEXT NOT NULL, status TEXT DEFAULT 'sent', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS emails (id TEXT PRIMARY KEY, message_id TEXT DEFAULT '', emailengine_id TEXT DEFAULT '', account TEXT NOT NULL DEFAULT 'ahmad', from_name TEXT DEFAULT '', from_email TEXT NOT NULL, to_email TEXT DEFAULT '', cc TEXT DEFAULT '', bcc TEXT DEFAULT '', subject TEXT DEFAULT '', body_text TEXT DEFAULT '', body_html TEXT DEFAULT '', folder TEXT NOT NULL DEFAULT 'INBOX', thread_id TEXT DEFAULT '', in_reply_to TEXT DEFAULT '', references_header TEXT DEFAULT '', seen INTEGER DEFAULT 0, flagged INTEGER DEFAULT 0, has_attachments INTEGER DEFAULT 0, size INTEGER DEFAULT 0, direction TEXT DEFAULT 'inbound', received_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_attachments (id TEXT PRIMARY KEY, email_id TEXT NOT NULL, filename TEXT DEFAULT '', content_type TEXT DEFAULT '', size INTEGER DEFAULT 0, emailengine_attachment_id TEXT DEFAULT '', local_path TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_threads (id TEXT PRIMARY KEY, subject TEXT NOT NULL, account TEXT NOT NULL DEFAULT 'ahmad', latest_date TEXT NOT NULL, message_count INTEGER DEFAULT 1, participants TEXT DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
];

for (const t of TABLES) sqlite.exec(t);
console.log("Tables created");

// Seed roles
const now = () => new Date().toISOString();
const roles = [
  { id: "1", name: "Admin", description: "Full access", permissions: ["view_dashboard","manage_campaigns","manage_websites","manage_users","manage_roles","export_data","view_audit","manage_settings","view_reports","manage_leads","manage_removal_list","send_emails"], isLeader: 1, leadsRoles: ["Manager","Viewer"] },
  { id: "2", name: "Manager", description: "Can manage campaigns", permissions: ["view_dashboard","manage_campaigns","view_websites","manage_leads","export_data","view_audit","view_reports","send_emails","manage_removal_list"], isLeader: 1, leadsRoles: ["Viewer"] },
  { id: "3", name: "Viewer", description: "Read-only access", permissions: ["view_dashboard","view_campaigns","view_websites","view_leads","view_reports"], isLeader: 0, leadsRoles: [] },
];
for (const r of roles) {
  sqlite.prepare(`INSERT OR IGNORE INTO roles (id, name, description, permissions, is_leader, leads_roles, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(r.id, r.name, r.description, JSON.stringify(r.permissions), r.isLeader, JSON.stringify(r.leadsRoles), now());
}
console.log("Roles seeded");

// Seed users
const users = [
  { email: "admin@intellilabs.com", password: "admin123", name: "Admin User", roleId: "1" },
  { email: "manager@intellilabs.com", password: "manager123", name: "Manager User", roleId: "2" },
  { email: "viewer@intellilabs.com", password: "viewer123", name: "Viewer User", roleId: "3" },
];
for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  sqlite.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, name, role_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(String(Date.now() + Math.random()), u.email, hash, u.name, u.roleId, now());
}
console.log("Users seeded");

// Seed websites
const websites = [
  { url: "https://brightcaremedical.com", name: "Bright Care Medical", category: "Healthcare", emails: "info@brightcaremedical.com" },
  { url: "https://greenvalleydental.com", name: "Green Valley Dental", category: "Dental", emails: "appointments@greenvalleydental.com" },
  { url: "https://premiercardiology.com", name: "Premier Cardiology", category: "Healthcare", emails: "info@premiercardiology.com" },
];
for (const w of websites) {
  sqlite.prepare(`INSERT OR IGNORE INTO websites (id, url, name, category, is_healthcare, emails, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(String(Date.now() + Math.random()), w.url, w.name, w.category, w.category === "Healthcare" ? 1 : 0, w.emails, now());
}
console.log("Websites seeded");

// Seed campaigns
const campaigns = [
  { name: "Q1 Newsletter", subject: "Quarterly Update", objective: "Keep subscribers informed", status: "sent", sent: 150, bounced: 3 },
  { name: "Product Launch", subject: "Introducing Our New Platform", objective: "Announce new features", status: "sent", sent: 200, bounced: 5 },
];
for (const c of campaigns) {
  const id = String(Date.now() + Math.random());
  sqlite.prepare(`INSERT OR IGNORE INTO campaigns (id, name, subject, objective, recipients, sent, bounced, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, c.name, c.subject, c.objective, c.sent + c.bounced, c.sent, c.bounced, c.status, now());
}
console.log("Campaigns seeded");

// Seed leads
const leadWebsites = [
  { name: "Bright Care Medical", type: "email", value: "info@brightcaremedical.com" },
  { name: "Green Valley Dental", type: "email", value: "appointments@greenvalleydental.com" },
  { name: "Premier Cardiology", type: "email", value: "info@premiercardiology.com" },
];
for (const l of leadWebsites) {
  sqlite.prepare(`INSERT OR IGNORE INTO leads (id, website_id, website_name, type, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(String(Date.now() + Math.random()), String(Math.random()), l.name, l.type, l.value, now());
}
console.log("Leads seeded");

// Seed sample emails
const accounts = { ahmad: "ahmad@demo-project-mail.xyz", siti: "siti@demo-project-mail.xyz", ryan: "ryan@demo-project-mail.xyz" };
const sampleSubjects = [
  "Q4 Strategy Meeting - Save the Date",
  "Project update for Q3",
  "Meeting request for next week",
  "Re: Campaign feedback request",
];
for (const [acct, email] of Object.entries(accounts)) {
  for (const subj of sampleSubjects) {
    const id = String(Date.now() + Math.random());
    const fromEmail = acct === "ahmad" ? "siti@demo-project-mail.xyz" : "ahmad@demo-project-mail.xyz";
    const fromName = acct === "ahmad" ? "siti" : "ahmad";
    sqlite.prepare(`INSERT OR IGNORE INTO emails (id, account, from_name, from_email, to_email, subject, body_text, folder, seen, direction, received_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, acct, fromName, fromEmail, email, subj, "Email body content here.", "INBOX", 0, "inbound", now(), now(), now());
  }
}
console.log("Sample emails seeded");

sqlite.close();
console.log("\n✓ Seed complete. Database at:", DB_PATH);

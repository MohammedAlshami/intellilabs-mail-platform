import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

const DB_PATH = path.join(process.cwd(), "app.db");

const ALL_TABLES = [
  `CREATE TABLE IF NOT EXISTS websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', scrape_progress TEXT DEFAULT '{}', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT DEFAULT '', role_id TEXT DEFAULT '', created_at TEXT NOT NULL)`,
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
  `CREATE TABLE IF NOT EXISTS email_signatures (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT DEFAULT '', is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_analysis (id TEXT PRIMARY KEY, email_id TEXT NOT NULL, sentiment TEXT DEFAULT '', reasoning TEXT DEFAULT '', suggested_reply TEXT DEFAULT '', created_at TEXT NOT NULL)`,
];

function run(sql: string, params?: any[]) {
  const sqlite = new Database(DB_PATH);
  try {
    if (params) return sqlite.prepare(sql).run(...params);
    else return sqlite.exec(sql);
  } finally {
    sqlite.close();
  }
}

function query(sql: string, params?: any[]) {
  const sqlite = new Database(DB_PATH);
  try {
    const stmt = sqlite.prepare(sql);
    if (params) stmt.bind(...params);
    return stmt.all();
  } finally {
    sqlite.close();
  }
}

function queryFirst(sql: string, params?: any[]) {
  const sqlite = new Database(DB_PATH);
  try {
    const stmt = sqlite.prepare(sql);
    if (params) stmt.bind(...params);
    return stmt.get() || null;
  } finally {
    sqlite.close();
  }
}

let _sqlite: Database.Database | null = null;

export async function getDb() {
  if (_db) return _db;

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");

  for (const tableSql of ALL_TABLES) {
    sqlite.exec(tableSql);
  }

  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema });

  return _db;
}

/** Helper to run raw SQL (used by older API routes) */
export function runRaw(sql: string, params?: any[]) {
  return { run: () => run(sql, params), query: () => query(sql, params), first: () => queryFirst(sql, params) };
}

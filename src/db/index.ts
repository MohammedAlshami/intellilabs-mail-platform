import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let _cloudflareDb: any | null = null;

export function setCloudflareD1(d1: any) {
  _cloudflareDb = d1;
}

let _localDb: any | null = null;
let _localD1: any | null = null;

const CF_API = "https://api.cloudflare.com/client/v4";

async function initLocal() {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();

  class LocalStatement {
    private db: any;
    private sql: string;
    private _values: any[] = [];
    constructor(db: any, sql: string) { this.db = db; this.sql = sql; }
    bind(...v: any[]) { this._values = v; return this; }
    raw() {
      const stmt = this.db.prepare(this.sql);
      if (this._values.length > 0) stmt.bind(this._values);
      const rows: any[] = []; while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      if (rows.length === 0) return [];
      const cols = Object.keys(rows[0]);
      return rows.map((row: any) => cols.map((c: string) => row[c]));
    }
    all() {
      const stmt = this.db.prepare(this.sql);
      if (this._values.length > 0) stmt.bind(this._values);
      const rows: any[] = []; while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free(); return { results: rows };
    }
    first(c?: string) {
      const stmt = this.db.prepare(this.sql);
      if (this._values.length > 0) stmt.bind(this._values);
      let r: any = null; if (stmt.step()) r = stmt.getAsObject();
      stmt.free(); return c ? r?.[c] ?? null : r ?? null;
    }
    run() { this.db.run(this.sql, this._values); return { success: true }; }
    _run() { this.db.run(this.sql, this._values); }
  }
  class LocalD1 {
    private _db: any;
    constructor(d: any) { this._db = d; }
    prepare(sql: string) { return new LocalStatement(this._db, sql); }
    exec(sql: string) { this._db.exec(sql); return { count: 0, duration: 0 }; }
    batch(s: any[]) { return s.map((x: any) => x._run()); }
  }

  _localD1 = new LocalD1(sqlDb);
  _localDb = drizzle(_localD1 as any, { schema });

  _localD1.exec(`CREATE TABLE IF NOT EXISTS websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT DEFAULT '', role_id TEXT DEFAULT '', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS email_lists (id TEXT PRIMARY KEY, name TEXT NOT NULL, emails TEXT NOT NULL, count INTEGER DEFAULT 0, source TEXT DEFAULT '', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, email TEXT NOT NULL, status TEXT DEFAULT 'sent', responded INTEGER DEFAULT 0, sentiment TEXT DEFAULT '', response_text TEXT DEFAULT '', sent_at TEXT DEFAULT '')`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, objective TEXT DEFAULT '', email_content TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, website_id TEXT NOT NULL, website_name TEXT DEFAULT '', type TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS bounce_responses (id TEXT PRIMARY KEY, email TEXT NOT NULL, type TEXT NOT NULL, reason TEXT DEFAULT '', confidence REAL DEFAULT 0, received TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS removal_list (id TEXT PRIMARY KEY, email TEXT NOT NULL, source TEXT DEFAULT '', reason TEXT DEFAULT '', flagged_at TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`);
  _localD1.exec(`CREATE TABLE IF NOT EXISTS sending_history (id TEXT PRIMARY KEY, campaign TEXT NOT NULL, campaign_id TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, date TEXT NOT NULL, status TEXT DEFAULT 'sent', created_at TEXT NOT NULL)`);
}

async function queryD1ViaApi(sql: string, params: any[] = []): Promise<any[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_TOKEN;

  if (!accountId || !databaseId || !token) {
    throw new Error("Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, or CLOUDFLARE_D1_TOKEN");
  }

  const res = await fetch(`${CF_API}/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const data: any = await res.json();
  if (!data.success) {
    throw new Error(`D1 API error: ${JSON.stringify(data.errors)}`);
  }
  return data.result;
}

class RemoteD1 {
  prepare(sql: string) {
    return new RemoteStatement(sql);
  }
  async exec(sql: string) {
    await queryD1ViaApi(sql);
    return { count: 0, duration: 0 };
  }
  batch(stmts: any[]) {
    return stmts.map((s: any) => s._run());
  }
}

class RemoteStatement {
  private sql: string;
  private _values: any[] = [];
  constructor(sql: string) { this.sql = sql; }
  bind(...v: any[]) { this._values = v; return this; }
  async raw() {
    const result = await queryD1ViaApi(this.sql, this._values);
    const rows = result[0]?.results || [];
    if (rows.length === 0) return [];
    const cols = Object.keys(rows[0]);
    return rows.map((row: any) => cols.map((c: string) => row[c]));
  }
  async all() {
    const result = await queryD1ViaApi(this.sql, this._values);
    return { results: result[0]?.results || [] };
  }
  async first(c?: string) {
    const result = await queryD1ViaApi(this.sql, this._values);
    const rows = result[0]?.results || [];
    const r = rows[0] || null;
    if (!r) return null;
    return c ? r[c] ?? null : r;
  }
  async run() {
    await queryD1ViaApi(this.sql, this._values);
    return { success: true };
  }
  _run() { return this.run(); }
}

export async function getDb() {
  if (_cloudflareDb) return _cloudflareDb;

  const useRemote = !!(process.env.CLOUDFLARE_D1_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
  if (useRemote) {
    if (!_localD1) {
      try {
        const remoteD1 = new RemoteD1();
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT DEFAULT '', role_id TEXT DEFAULT '', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS email_lists (id TEXT PRIMARY KEY, name TEXT NOT NULL, emails TEXT NOT NULL, count INTEGER DEFAULT 0, source TEXT DEFAULT '', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, email TEXT NOT NULL, status TEXT DEFAULT 'sent', responded INTEGER DEFAULT 0, sentiment TEXT DEFAULT '', response_text TEXT DEFAULT '', sent_at TEXT DEFAULT '')`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, objective TEXT DEFAULT '', email_content TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, website_id TEXT NOT NULL, website_name TEXT DEFAULT '', type TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS bounce_responses (id TEXT PRIMARY KEY, email TEXT NOT NULL, type TEXT NOT NULL, reason TEXT DEFAULT '', confidence REAL DEFAULT 0, received TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS removal_list (id TEXT PRIMARY KEY, email TEXT NOT NULL, source TEXT DEFAULT '', reason TEXT DEFAULT '', flagged_at TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`);
        await remoteD1.exec(`CREATE TABLE IF NOT EXISTS sending_history (id TEXT PRIMARY KEY, campaign TEXT NOT NULL, campaign_id TEXT DEFAULT '', recipients INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, date TEXT NOT NULL, status TEXT DEFAULT 'sent', created_at TEXT NOT NULL)`);
        _localD1 = remoteD1;
        _localDb = drizzle(remoteD1 as any, { schema });
      } catch (e: any) {
        throw new Error(`D1 init failed: ${e?.message ?? e}`);
      }
    }
    return _localDb!;
  }

  if (!_localDb) await initLocal();
  return _localDb!;
}

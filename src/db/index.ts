import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// D1-compatible shim using sql.js (pure JS WASM SQLite)
class LocalD1Statement {
  private db: any;
  private sql: string;
  private _values: any[] = [];

  constructor(db: any, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...values: any[]) {
    this._values = values;
    return this;
  }

  all() {
    const stmt = this.db.prepare(this.sql);
    if (this._values.length > 0) stmt.bind(this._values);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return { results: rows };
  }

  first(colName?: string) {
    const stmt = this.db.prepare(this.sql);
    if (this._values.length > 0) stmt.bind(this._values);
    let row: any = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    if (colName) return row?.[colName] ?? null;
    return row ?? null;
  }

  run() {
    this.db.run(this.sql, this._values);
    return { success: true };
  }

  raw() {
    const stmt = this.db.prepare(this.sql);
    if (this._values.length > 0) stmt.bind(this._values);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.get());
    stmt.free();
    return rows;
  }

  _run() {
    this.db.run(this.sql, this._values);
  }
}

class LocalD1Database {
  private _db: any;

  constructor(sqlDb: any) {
    this._db = sqlDb;
  }

  prepare(sql: string) {
    return new LocalD1Statement(this._db, sql);
  }

  exec(sql: string) {
    this._db.exec(sql);
    return { count: 0, duration: 0 };
  }

  batch(stmts: any[]) {
    return stmts.map((s: any) => s._run());
  }
}

let _db: ReturnType<typeof drizzle> | null = null;
let _d1: LocalD1Database | null = null;

export async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();

  _d1 = new LocalD1Database(sqlDb);
  _db = drizzle(_d1 as any, { schema });

  // Create tables
  _d1.exec(`CREATE TABLE IF NOT EXISTS websites (id TEXT PRIMARY KEY, url TEXT NOT NULL, name TEXT DEFAULT '', category TEXT DEFAULT '', is_healthcare INTEGER DEFAULT 0, emails TEXT DEFAULT '', phones TEXT DEFAULT '', description TEXT DEFAULT '', summary TEXT DEFAULT '', services TEXT DEFAULT '[]', scrape_status TEXT DEFAULT 'idle', created_at TEXT NOT NULL)`);
  _d1.exec(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT DEFAULT '', user_id TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT NOT NULL)`);
  _d1.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', permissions TEXT DEFAULT '[]', is_leader INTEGER DEFAULT 0, leads_roles TEXT DEFAULT '[]', created_at TEXT NOT NULL)`);

  return _db;
}

export function getD1() {
  return _d1!;
}

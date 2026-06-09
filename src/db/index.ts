import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({ url: "file:data.db" });
const db = drizzle(client, { schema });

// Create tables (async, but we don't need to wait for it)
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

export { db, client };

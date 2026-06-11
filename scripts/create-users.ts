import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const accounts = [
  { name: "Ahmad", email: "ahmad@demo-project-mail.xyz" },
  { name: "Siti", email: "siti@demo-project-mail.xyz" },
  { name: "Ryan", email: "ryan@demo-project-mail.xyz" },
  { name: "Nurul", email: "nurul@demo-project-mail.xyz" },
  { name: "David", email: "david@demo-project-mail.xyz" },
];

const PASSWORD = "***REDACTED***";

async function main() {
  const db = await getDb();
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const acct of accounts) {
    const existing = await db.select().from(users).where(eq(users.email, acct.email));
    if (existing.length > 0) {
      console.log(`User already exists: ${acct.email}`);
      continue;
    }

    await db.insert(users).values({
      id: uuidv4(),
      email: acct.email,
      passwordHash: hash,
      name: acct.name,
      createdAt: new Date().toISOString(),
    });
    console.log(`Created user: ${acct.email}`);
  }

  console.log("Done");
}

main().catch(console.error);

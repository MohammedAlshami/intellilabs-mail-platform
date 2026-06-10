import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bounceResponses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(bounceResponses);
  return NextResponse.json(all);
}

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { leads } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(leads);
  return NextResponse.json(all);
}

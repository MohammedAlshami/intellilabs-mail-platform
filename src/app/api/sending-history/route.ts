import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sendingHistory } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(sendingHistory);
  return NextResponse.json(all);
}

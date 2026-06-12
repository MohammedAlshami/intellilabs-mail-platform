import { NextRequest, NextResponse } from "next/server";
import { getAnalysis } from "@/lib/email-analysis-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const cached = getAnalysis(messageId);
  if (cached) {
    return NextResponse.json(cached);
  }
  return NextResponse.json({ error: "Analysis not yet available" }, { status: 404 });
}

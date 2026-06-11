import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ACCOUNT } from "@/lib/emailengine";

const BASE_URL = (process.env.EMAILENGINE_API_URL || "http://localhost:9090/v1").replace(/\/v1$/, "");
const V1_URL = `${BASE_URL}/v1`;
const API_TOKEN = process.env.EMAILENGINE_API_TOKEN || "";

function getHeaders() {
  return { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const { action } = await req.json();
  const acct = DEFAULT_ACCOUNT;

  try {
    switch (action) {
      case "archive": {
        await fetch(`${V1_URL}/account/${encodeURIComponent(acct)}/message/${encodeURIComponent(messageId)}/move`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ path: "\\Archive" }),
        });
        return NextResponse.json({ ok: true });
      }
      case "trash": {
        await fetch(`${V1_URL}/account/${encodeURIComponent(acct)}/message/${encodeURIComponent(messageId)}/move`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ path: "\\Trash" }),
        });
        return NextResponse.json({ ok: true });
      }
      case "read": {
        await fetch(`${V1_URL}/account/${encodeURIComponent(acct)}/message/${encodeURIComponent(messageId)}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ seen: true }),
        });
        return NextResponse.json({ ok: true });
      }
      case "unread": {
        await fetch(`${V1_URL}/account/${encodeURIComponent(acct)}/message/${encodeURIComponent(messageId)}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ seen: false }),
        });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("EmailEngine action error:", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

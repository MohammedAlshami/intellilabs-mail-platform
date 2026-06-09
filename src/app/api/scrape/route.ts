import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const domain = url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];
  const scriptPath = path.join(process.cwd(), "scripts", "email_extractor.py");

  try {
    const output = execSync(`python "${scriptPath}" "${domain}"`, {
      timeout: 60000,
      shell: "cmd.exe",
      cwd: process.cwd(),
      encoding: "utf-8",
    });

    // Parse output for email addresses
    const emailRegex = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
    const emails = [...new Set(output.match(emailRegex) || [])];
    const lines = output.split("\n").filter(l => l.includes("emails") || l.includes("Done"));

    return NextResponse.json({
      status: "done",
      emails,
      summary: lines.join("\n"),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message,
      output: err.stdout || "",
    });
  }
}

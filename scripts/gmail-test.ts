/**
 * Gmail API test script.
 * Uses OAuth2 credentials from gmail-auth/ to send test emails.
 * Run: npx tsx scripts/gmail-test.ts
 */
import { google } from "googleapis";
import { createReadStream, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { authenticate } from "@google-cloud/local-auth";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const TOKEN_PATH = join(__dirname, "..", "gmail-auth", "token.pickle");
const CREDS_PATH = join(__dirname, "..", "gmail-auth", "credentials.json");

async function loadToken() {
  try {
    return JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
  } catch {
    return null;
  }
}

async function saveToken(creds: any) {
  writeFileSync(TOKEN_PATH, JSON.stringify(creds, null, 2));
}

async function getAuth() {
  let creds = await loadToken();
  if (creds) {
    const { GoogleAuth } = require("google-auth-library");
    const auth = new GoogleAuth({ credentials: creds, scopes: SCOPES });
    return auth;
  }
  // Fall back to OAuth flow (requires browser)
  const auth = await authenticate({
    keyfilePath: CREDS_PATH,
    scopes: SCOPES,
  });
  if (auth.credentials) {
    await saveToken(auth.credentials);
  }
  return auth;
}

async function sendTestEmail(to: string, subject: string, bodyHtml: string) {
  const auth = await getAuth();
  const gmail = google.gmail({ version: "v1", auth });

  const utf8Bytes = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${bodyHtml}`
  );
  const raw = utf8Bytes.toString("base64url");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  console.log(`Email sent to ${to}! ID: ${res.data.id}`);
  return res.data;
}

// Run if called directly
const to = process.argv[2] || "alshamicourses@gmail.com";
const subject = process.argv[3] || "Test from mail-platform";
const body = process.argv[4] || "<p>Hi,</p><p>This is a test email.</p>";

sendTestEmail(to, subject, body).catch(console.error);

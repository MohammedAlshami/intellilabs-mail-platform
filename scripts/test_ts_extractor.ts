import { extractEmails } from "../src/lib/email-extractor";

async function main() {
  const emails = await extractEmails("ijo-bs.com");
  console.log("Found:", emails.length);
  for (const e of emails) {
    console.log("  ", e);
  }
}
main().catch((e) => console.error("Error:", e.message));

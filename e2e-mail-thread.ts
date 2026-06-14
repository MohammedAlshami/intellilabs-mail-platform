import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  let allOk = true;

  async function loginAs(email: string, pw: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(3000);
    return { ctx, page };
  }

  // Step 1: Login as ahmad, send email via UI
  console.log("=== Step 1: Send email from ahmad ===");
  let { ctx, page } = await loginAs("ahmad@demo-project-mail.xyz", "ahmad123");

  // Navigate to mail page
  await page.goto("http://localhost:3001/mail", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Find and click New/Compose button
  const composeBtn = await page.$('button:has-text("New")');
  if (!composeBtn) { console.log("FAIL: Compose button not found"); allOk = false; }
  else {
    await composeBtn.click();
    await page.waitForTimeout(1000);

    // Fill in compose form
    const toInput = await page.$('input[placeholder*="To"], input[placeholder*="email"]');
    if (toInput) {
      await toInput.fill("mshami2021@gmail.com");
    }

    const subjectInput = await page.$('input[placeholder*="Subject"]');
    if (subjectInput) {
      await subjectInput.fill("Playwright UI thread test");
    }

    const bodyInput = await page.$('textarea, div[contenteditable]');
    if (bodyInput) {
      await bodyInput.fill("This email was sent from the Playwright UI test.\n\nBest,\nAhmad");
    }

    // Click send
    const sendBtn = await page.$('button:has-text("Send")');
    if (sendBtn) {
      await sendBtn.click();
      await page.waitForTimeout(3000);
      console.log("  Email sent from UI");
    }
  }

  // Check sent folder
  await page.goto("http://localhost:3001/mail", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const sentTabBtn = await page.$('button:has-text("Sent")');
  if (sentTabBtn) {
    await sentTabBtn.click();
    await page.waitForTimeout(2000);
    console.log("  Navigated to Sent folder");
  }

  const viewerCookies = await ctx.cookies();
  const ahmadToken = viewerCookies.find(c => c.name === "token")?.value;
  await ctx.close();

  // Step 2: Check Gmail for the email
  console.log("\n=== Step 2: Check Gmail inbox ===");
  const { execSync } = require("child_process");
  const result = execSync(
    `cd /root/mail-platform/gmail-auth && python3 -c "
import pickle, os, time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import base64

with open('token.pickle', 'rb') as f:
    creds = pickle.load(f)
if creds.expired and creds.refresh_token:
    creds.refresh(Request())
    with open('token.pickle', 'wb') as f:
        pickle.dump(creds, f)

service = build('gmail', 'v1', credentials=creds)

for att in range(15):
    results = service.users().messages().list(userId='me', maxResults=1, q='from:ahmad@demo-project-mail.xyz subject:\\"Playwright UI thread test\\"').execute()
    if results.get('messages'):
        msg = service.users().messages().get(userId='me', id=results['messages'][0]['id'], format='full').execute()
        hdrs = {h['name']: h['value'] for h in msg['payload']['headers']}
        mid = hdrs.get('Message-Id', hdrs.get('Message-ID', ''))
        gthread = msg['threadId']
        print(f'FOUND|{mid}|{gthread}')
        break
    time.sleep(2)
else:
    print('NOT_FOUND')
" 2>&1`, { encoding: "utf8", timeout: 30000 }
  ).trim();

  console.log(`  Gmail result: ${result.split('|')[0]}`);

  if (result.startsWith("FOUND")) {
    const parts = result.split("|");
    const origMsgId = parts[1];
    const gmailThreadId = parts[2];
    console.log(`  Original Msg-ID: ${origMsgId.slice(0, 50)}...`);

    // Step 3: Reply from Gmail
    console.log("\n=== Step 3: Reply from Gmail ===");
    const replyResult = execSync(
      `cd /root/mail-platform/gmail-auth && python3 -c "
import pickle, os, base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

with open('token.pickle', 'rb') as f:
    creds = pickle.load(f)
if creds.expired and creds.refresh_token:
    creds.refresh(Request())
    with open('token.pickle', 'wb') as f:
        pickle.dump(creds, f)

service = build('gmail', 'v1', credentials=creds)
reply = MIMEMultipart()
reply['To'] = 'ahmad@demo-project-mail.xyz'
reply['Subject'] = 'Re: Playwright UI thread test'
reply['In-Reply-To'] = '${origMsgId}'
reply['References'] = '${origMsgId}'
reply.attach(MIMEText('Got your Playwright test email! Replying back via Gmail.', 'plain'))
raw = base64.urlsafe_b64encode(reply.as_bytes()).decode()
sent = service.users().messages().send(userId='me', body={'raw': raw, 'threadId': '${gmailThreadId}'}).execute()
print(f'SENT|{sent.get(\"id\")}|{sent.get(\"threadId\")}')
" 2>&1`, { encoding: "utf8", timeout: 15000 }
    ).trim();
    console.log(`  Gmail reply sent: ${replyResult.split('|')[0]}`);

    // Wait for reply to arrive in ahmad's inbox
    console.log("\n  Waiting for Gmail reply to reach ahmad's inbox...");
    await new Promise(r => setTimeout(r, 20000));

    // Step 4: Login as ahmad and check the inbox
    console.log("\n=== Step 4: Check ahmad's inbox for reply ===");
    ({ ctx, page } = await loginAs("ahmad@demo-project-mail.xyz", "ahmad123"));
    await page.goto("http://localhost:3001/mail", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Check if there's a thread with "Playwright UI thread test" subject
    const threadItem = await page.$(\`text="Playwright UI thread test"\`);
    if (threadItem) {
      console.log("  Thread found in inbox!");
      await threadItem.click();
      await page.waitForTimeout(2000);

      // Check if multiple messages are shown in the thread
      const threadMessages = await page.$$('.border-t.pt-4');
      console.log(\`  Thread messages found: \${threadMessages.length + 1}\`);

      // Reply via UI
      console.log("\n=== Step 5: Reply from UI ===");
      const replyBtn = await page.$('button:has-text("Reply")');
      if (replyBtn) {
        await replyBtn.click();
        await page.waitForTimeout(1000);

        const replyBody = await page.$('textarea, div[contenteditable]');
        if (replyBody) {
          await replyBody.fill("Replying from the UI! Threading works.");
        }

        const sendReplyBtn = await page.$('button:has-text("Send")');
        if (sendReplyBtn) {
          await sendReplyBtn.click();
          await page.waitForTimeout(3000);
          console.log("  Reply sent from UI");
        }
      }
    } else {
      console.log("  Thread NOT found in inbox (maybe webhook didn't process it yet)");
      allOk = false;
    }
    await ctx.close();

    // Step 6: Verify all 3 messages in same Gmail thread
    console.log("\n=== Step 6: Verify full thread in Gmail ===");
    await new Promise(r => setTimeout(r, 15000));
    const finalCheck = execSync(
      `cd /root/mail-platform/gmail-auth && python3 -c "
import pickle, os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

with open('token.pickle', 'rb') as f:
    creds = pickle.load(f)
if creds.expired and creds.refresh_token:
    creds.refresh(Request())
    with open('token.pickle', 'wb') as f:
        pickle.dump(creds, f)

service = build('gmail', 'v1', credentials=creds)
thread = service.users().threads().get(userId='me', id='${gmailThreadId}', format='full').execute()
msgs = thread.get('messages', [])
print(f'COUNT|{len(msgs)}')
for m in msgs:
    hdrs = {h['name']: h['value'] for h in m['payload']['headers']}
    frm = hdrs.get('From', '').split('<')[0].strip() or hdrs.get('From', '')
    print(f'  MSG|{frm}|{hdrs.get(\"Subject\",\"\")}')
" 2>&1`, { encoding: "utf8", timeout: 15000 }
    ).trim();

    const lines = finalCheck.split('\n');
    const countLine = lines.find(l => l.startsWith('COUNT|'));
    if (countLine) {
      const count = parseInt(countLine.split('|')[1]);
      console.log(`  Messages in Gmail thread: ${count}`);
      if (count >= 3) {
        console.log("  ✅ All messages properly threaded!");
      } else {
        console.log(`  ❌ Expected 3+ messages, found ${count}`);
        allOk = false;
      }
    }
  } else {
    console.log("  ❌ Email not found in Gmail inbox");
    allOk = false;
  }

  await browser.close();
  if (!allOk) {
    console.log("\n⚠ Some checks FAILED");
    process.exit(1);
  }
  console.log("\n✅ All thread tests passed!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

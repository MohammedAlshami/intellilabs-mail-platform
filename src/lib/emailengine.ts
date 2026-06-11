const BASE_URL = (process.env.EMAILENGINE_API_URL || "http://localhost:9090/v1").replace(/\/v1$/, "");
const V1_URL = `${BASE_URL}/v1`;
const API_TOKEN = process.env.EMAILENGINE_API_TOKEN || "";
export const DEFAULT_ACCOUNT = process.env.EMAILENGINE_ACCOUNT || "ahmad";

let sessionCookie: string | null = null;
let sessionExpiry = 0;

function getHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function getSessionCookie(): Promise<string | null> {
  if (sessionCookie && Date.now() < sessionExpiry) return sessionCookie;

  const user = process.env.EMAILENGINE_ADMIN_USER;
  const pass = process.env.EMAILENGINE_ADMIN_PASS;
  if (!user || !pass) return null;

  try {
    const loginPage = await fetch(`${BASE_URL}/admin/login`);
    const html = await loginPage.text();
    const crumb = html.match(/id="crumb" value="([^"]+)"/)?.[1];
    if (!crumb) return null;

    const loginRes = await fetch(`${BASE_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&crumb=${encodeURIComponent(crumb)}&remember=Y`,
      redirect: "manual",
    });

    const cookies = loginRes.headers.get("set-cookie") || "";
    sessionCookie = cookies.split(";")[0];
    sessionExpiry = Date.now() + 25 * 60 * 60 * 1000;
    return sessionCookie;
  } catch {
    return null;
  }
}

function getSessionHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

export interface EmailEngineMessage {
  id: string;
  uid: number;
  date: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  subject?: string;
  text?: string | { id: string; encodedSize: { plain: number; html?: number } };
  html?: string | { id: string; encodedSize: { plain: number } };
  unseen: boolean;
  flags: string[];
  attachments: {
    id: string;
    filename?: string;
    contentType?: string;
    size?: number;
  }[];
}

export interface ListMessagesResponse {
  total: number;
  page: number;
  pages: number;
  nextPageCursor: string | null;
  prevPageCursor: string | null;
  messages: EmailEngineMessage[];
}

export interface SendMailParams {
  from?: { address: string };
  to: { address: string }[];
  subject: string;
  text: string;
  attachments?: { filename?: string; contentType?: string; content: string }[];
}

export interface SendMailResponse {
  queueId: string;
}

export async function listMessages(
  account?: string,
  options?: { pageSize?: number; path?: string }
): Promise<ListMessagesResponse> {
  const acct = account || DEFAULT_ACCOUNT;
  const params = new URLSearchParams();
  params.set("path", options?.path || "INBOX");
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));

  const res = await fetch(`${V1_URL}/account/${encodeURIComponent(acct)}/messages?${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailEngine list error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getMessage(
  messageId: string,
  account?: string
): Promise<EmailEngineMessage | null> {
  const acct = account || DEFAULT_ACCOUNT;

  const res = await fetch(
    `${V1_URL}/account/${encodeURIComponent(acct)}/message/${encodeURIComponent(messageId)}`,
    { headers: getHeaders() }
  );
  if (!res.ok) return null;
  const msg: EmailEngineMessage = await res.json();

  // Fetch actual text content if it's a reference object
  if (msg.text && typeof msg.text === "object" && (msg.text as any).id) {
    try {
      const textRes = await fetch(
        `${V1_URL}/account/${encodeURIComponent(acct)}/text/${encodeURIComponent((msg.text as any).id)}`,
        { headers: getHeaders() }
      );
      if (textRes.ok) {
        const textData = await textRes.json();
        msg.text = textData.plain || textData.html || "";
      }
    } catch {}
  }

  // Fetch HTML content if available
  if (msg.html && typeof msg.html === "object" && (msg.html as any).id) {
    try {
      const htmlRes = await fetch(
        `${V1_URL}/account/${encodeURIComponent(acct)}/text/${encodeURIComponent((msg.html as any).id)}`,
        { headers: getHeaders() }
      );
      if (htmlRes.ok) {
        const htmlData = await htmlRes.json();
        msg.html = htmlData.plain || htmlData.html || "";
      }
    } catch {}
  }

  return msg;
}

export async function sendMail(
  params: SendMailParams,
  account?: string
): Promise<SendMailResponse> {
  const acct = account || DEFAULT_ACCOUNT;
  const res = await fetch(
    `${V1_URL}/account/${encodeURIComponent(acct)}/submit`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailEngine send error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getAttachment(
  messageId: string,
  attachmentId: string,
  account?: string
): Promise<Response> {
  const acct = account || DEFAULT_ACCOUNT;

  return fetch(
    `${V1_URL}/account/${encodeURIComponent(acct)}/attachment/${encodeURIComponent(attachmentId)}`,
    { headers: getHeaders() }
  );
}

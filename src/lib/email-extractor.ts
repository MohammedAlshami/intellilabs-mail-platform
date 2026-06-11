import { execSync } from "child_process";
import path from "path";

export async function extractEmails(domain: string): Promise<string[]> {
  domain = domain.replace(/http[s]?:\/\//, "").split("/")[0];
  const url = `https://${domain}`;

  try {
    const script = path.join(process.cwd(), "scripts", "crawl_emails.py");
    const output = execSync(`python3 "${script}" "${url}"`, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    const result = JSON.parse(output);
    if (result.error) {
      console.error("Email crawler error:", result.error);
      return [];
    }
    return result.emails || [];
  } catch (e: any) {
    console.error("Email crawler failed:", e.message);
    return [];
  }
}

import { getDb } from "@/db";
import { roles, auditLogs, websites, leads, campaigns, campaignRecipients, emailLists, sendingHistory, bounceResponses, removalList, users } from "@/db/schema";
import bcrypt from "bcryptjs";

async function runAll() {
  const db = await getDb();

  console.log("Seeding roles...");
  const existingRoles = await db.select().from(roles);
  if (existingRoles.length === 0) {
    const roleData = [
      { id: '1', name: 'Admin', description: 'Full access to all features', permissions: ["view_dashboard","manage_campaigns","manage_websites","manage_users","manage_roles","export_data","view_audit","manage_settings","view_reports","manage_leads","manage_removal_list","send_emails"], isLeader: true, leadsRoles: ["Manager","Viewer"] },
      { id: '2', name: 'Manager', description: 'Can manage campaigns and view most data', permissions: ["view_dashboard","manage_campaigns","view_websites","manage_leads","export_data","view_audit","view_reports","send_emails","manage_removal_list"], isLeader: true, leadsRoles: ["Viewer"] },
      { id: '3', name: 'Viewer', description: 'Read-only access to dashboards and reports', permissions: ["view_dashboard","view_campaigns","view_websites","view_leads","view_reports","view_audit"], isLeader: false, leadsRoles: [] },
    ];
    for (const r of roleData) {
      await db.insert(roles).values({
        id: r.id, name: r.name, description: r.description,
        permissions: JSON.stringify(r.permissions), isLeader: r.isLeader,
        leadsRoles: JSON.stringify(r.leadsRoles), createdAt: '2026-06-01T00:00:00',
      });
    }
    console.log(`  Seeded ${roleData.length} roles`);
  }

  console.log("Seeding users...");
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const userData = [
      { email: "admin@intellilabs.com", password: "admin123", name: "Admin User", roleId: "1" },
      { email: "manager@intellilabs.com", password: "manager123", name: "Manager User", roleId: "2" },
      { email: "viewer@intellilabs.com", password: "viewer123", name: "Viewer User", roleId: "3" },
    ];
    for (const u of userData) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.insert(users).values({
        id: String(Date.now()), email: u.email, passwordHash: hash,
        name: u.name, roleId: u.roleId, createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${userData.length} users`);
  }

  console.log("Seeding websites...");
  const existingWebsites = await db.select().from(websites);
  if (existingWebsites.length === 0) {
    const websiteData = [
      { url: "https://brightcaremedical.com", name: "Bright Care Medical", category: "Healthcare", isHealthcare: true, emails: "info@brightcaremedical.com", phones: "+1 (555) 123-4567", description: "A multi-specialty healthcare clinic", summary: "Healthcare provider", services: ["primary care", "urgent care", "telehealth"] },
      { url: "https://greenvalleydental.com", name: "Green Valley Dental", category: "Dental", isHealthcare: true, emails: "appointments@greenvalleydental.com", phones: "+1 (555) 234-5678", description: "Family and cosmetic dentistry", summary: "Dental practice", services: ["general dentistry", "cosmetic dentistry"] },
      { url: "https://techsolutions.io", name: "Tech Solutions Inc", category: "Technology", isHealthcare: false, emails: "contact@techsolutions.io, sales@techsolutions.io", phones: "+1 (555) 345-6789", description: "B2B SaaS company", summary: "Enterprise software", services: ["CRM platform", "analytics", "consulting"] },
      { url: "https://oakwoodrealty.com", name: "Oakwood Realty", category: "Real Estate", isHealthcare: false, emails: "listings@oakwoodrealty.com", phones: "+1 (555) 456-7890", description: "Full-service real estate agency", summary: "Real estate agency", services: ["residential sales", "property management"] },
      { url: "https://primephysio.com", name: "Prime Physiotherapy", category: "Healthcare", isHealthcare: true, emails: "care@primephysio.com", phones: "+1 (555) 567-8901", description: "Physiotherapy and rehabilitation", summary: "Rehab center", services: ["physiotherapy", "sports rehab"] },
      { url: "https://horizonfin.com", name: "Horizon Financial", category: "Finance", isHealthcare: false, emails: "support@horizonfin.com, info@horizonfin.com", phones: "+1 (555) 678-9012", description: "Financial advisory", summary: "Financial services", services: ["investment management", "financial planning"] },
    ];
    for (const w of websiteData) {
      await db.insert(websites).values({
        id: String(Date.now() + Math.random()), url: w.url, name: w.name,
        category: w.category, isHealthcare: w.isHealthcare,
        emails: w.emails, phones: w.phones, description: w.description,
        summary: w.summary, services: JSON.stringify(w.services),
        scrapeStatus: "done", createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${websiteData.length} websites`);

    const allWs = await db.select().from(websites);
    const leadsData: any[] = [];
    for (const ws of allWs) {
      const emailList = (ws.emails || '').split(',').map((e: string) => e.trim()).filter(Boolean);
      const phoneList = (ws.phones || '').split(',').map((p: string) => p.trim()).filter(Boolean);
      for (const email of emailList) leadsData.push({ websiteId: ws.id, websiteName: ws.name, type: 'email', value: email });
      for (const phone of phoneList) leadsData.push({ websiteId: ws.id, websiteName: ws.name, type: 'phone', value: phone });
    }
    for (const l of leadsData) {
      await db.insert(leads).values({
        id: String(Date.now() + Math.random()), websiteId: l.websiteId,
        websiteName: l.websiteName, type: l.type, value: l.value,
        createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${leadsData.length} leads`);
  }

  console.log("Seeding email lists...");
  const existingLists = await db.select().from(emailLists);
  if (existingLists.length === 0) {
    const listData = [
      { name: "Q3 Newsletter Subscribers", emails: "john@example.com, jane@company.com, bob@test.com, alice@domain.com, carol@site.org", source: "Manual upload" },
      { name: "Healthcare Leads", emails: "info@brightcaremedical.com, appointments@greenvalleydental.com, care@primephysio.com", source: "brightcaremedical.com" },
      { name: "Bounced Emails", emails: "bounce@example.com, invalid@test.com, spam@complaint.com", source: "System auto-collected" },
      { name: "Tech Solutions Contacts", emails: "contact@techsolutions.io, sales@techsolutions.io", source: "techsolutions.io" },
      { name: "Real Estate Prospects", emails: "listings@oakwoodrealty.com", source: "oakwoodrealty.com" },
      { name: "Financial Advisors", emails: "support@horizonfin.com, info@horizonfin.com", source: "horizonfin.com" },
    ];
    for (const el of listData) {
      const emailsArr = el.emails.split(/,\s*/).filter(Boolean);
      await db.insert(emailLists).values({
        id: String(Date.now() + Math.random()), name: el.name,
        emails: emailsArr.join(", "), count: emailsArr.length,
        source: el.source, createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${listData.length} email lists`);
  }

  console.log("Seeding campaigns...");
  const existingCampaigns = await db.select().from(campaigns);
  if (existingCampaigns.length === 0) {
    const campaignData = [
      { name: "Q3 Newsletter", subject: "Your Q3 Update", objective: "Update subscribers on Q3 developments", emailContent: "Hi there,\n\nWe're excited to share our Q3 update with you.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 95, bounced: 5, status: "sent" },
      { name: "Welcome Series", subject: "Welcome to our platform", objective: "Onboard new users", emailContent: "Welcome aboard!\n\nWe're thrilled to have you.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 98, bounced: 2, status: "sent" },
      { name: "Holiday Promotion", subject: "Exclusive holiday deals inside", objective: "Promote holiday offers", emailContent: "Happy Holidays!\n\nCheck out our exclusive deals.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 97, bounced: 3, status: "sent" },
      { name: "Product Launch", subject: "Introducing our new feature", objective: "Announce new analytics dashboard", emailContent: "We're proud to introduce our newest feature.\n\nBest,\nThe IntelliLabs Team", recipients: 100, sent: 0, bounced: 0, status: "draft" },
    ];
    for (const c of campaignData) {
      await db.insert(campaigns).values({
        id: String(Date.now() + Math.random()), name: c.name, subject: c.subject,
        objective: c.objective, emailContent: c.emailContent,
        recipients: c.recipients, sent: c.sent, bounced: c.bounced,
        status: c.status, createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${campaignData.length} campaigns`);

    const allCamps = await db.select().from(campaigns);
    const statuses = ["sent", "sent", "sent", "sent", "sent", "sent", "sent", "bounced", "responded", "responded"];
    const sentiments = ["", "", "", "", "interested", "rejected", "neutral", "", "", ""];
    const responses = ["Thanks for the update!", "This looks great! When can we schedule a demo?", "Not interested at this time, please remove me.", "", "", "", "", "", "", ""];
    for (const c of allCamps) {
      const count = Math.min(c.recipients || 100, 100);
      for (let i = 0; i < count; i++) {
        const email = `user${i}@example.com`;
        const status = statuses[i % statuses.length];
        const responded = status === "responded" ? true : false;
        await db.insert(campaignRecipients).values({
          id: String(Date.now() + Math.random()), campaignId: c.id, email,
          status, responded, sentiment: responded ? sentiments[i % sentiments.length] : "",
          responseText: responded ? responses[i % responses.length] : "",
          sentAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        });
      }
    }
    console.log(`  Seeded recipients for ${allCamps.length} campaigns`);
  }

  console.log("Seeding bounce responses...");
  const existingBounces = await db.select().from(bounceResponses);
  if (existingBounces.length === 0) {
    const bounceData = [
      { email: "bounce@example.com", type: "bounce", reason: "Mailbox full", confidence: 0.95, status: "pending" },
      { email: "invalid@test.com", type: "bounce", reason: "Invalid email address", confidence: 0.99, status: "pending" },
      { email: "autoreply@company.com", type: "auto-reply", reason: "Out of office", confidence: 0.88, status: "resolved" },
      { email: "spam@complaint.com", type: "bounce", reason: "Spam complaint", confidence: 0.92, status: "pending" },
      { email: "vacation@domain.com", type: "auto-reply", reason: "On vacation until July", confidence: 0.85, status: "resolved" },
    ];
    for (const b of bounceData) {
      await db.insert(bounceResponses).values({
        id: String(Date.now() + Math.random()), email: b.email, type: b.type,
        reason: b.reason, confidence: b.confidence,
        received: new Date().toISOString(), status: b.status,
        createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${bounceData.length} bounce responses`);
  }

  console.log("Seeding removal list...");
  const existingRemoval = await db.select().from(removalList);
  if (existingRemoval.length === 0) {
    const removalData = [
      { email: "bounce@example.com", source: "Q3 Newsletter", reason: "Hard Bounce", status: "pending" },
      { email: "unsub@test.com", source: "Welcome Series", reason: "Unsubscribed", status: "pending" },
      { email: "spam@complaint.com", source: "Holiday Promotion", reason: "Spam Complaint", status: "removed" },
      { email: "invalid@domain.com", source: "Manual entry", reason: "Invalid Email", status: "pending" },
      { email: "left@company.com", source: "Bright Care Medical", reason: "Resigned / Left Company", status: "pending" },
    ];
    for (const r of removalData) {
      await db.insert(removalList).values({
        id: String(Date.now() + Math.random()), email: r.email, source: r.source,
        reason: r.reason, flaggedAt: new Date().toISOString(),
        status: r.status, createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${removalData.length} removal list items`);
  }

  console.log("Seeding sending history...");
  const existingHistory = await db.select().from(sendingHistory);
  if (existingHistory.length === 0) {
    const historyData = [
      { campaign: "Q3 Newsletter", campaign_id: "camp-001", recipients: 1200, sent: 1180, bounced: 20, status: "completed" },
      { campaign: "Welcome Series", campaign_id: "camp-002", recipients: 450, sent: 445, bounced: 5, status: "completed" },
      { campaign: "Holiday Promotion", campaign_id: "camp-003", recipients: 2000, sent: 1980, bounced: 20, status: "completed" },
      { campaign: "john@example.com", campaign_id: "single-001", recipients: 1, sent: 1, bounced: 0, status: "completed" },
      { campaign: "jane@company.com", campaign_id: "single-002", recipients: 1, sent: 1, bounced: 0, status: "completed" },
      { campaign: "bob@test.com", campaign_id: "single-003", recipients: 1, sent: 0, bounced: 1, status: "failed" },
      { campaign: "alice@domain.com", campaign_id: "single-004", recipients: 1, sent: 1, bounced: 0, status: "completed" },
    ];
    for (const h of historyData) {
      await db.insert(sendingHistory).values({
        id: String(Date.now() + Math.random()), campaign: h.campaign,
        campaignId: h.campaign_id, recipients: h.recipients,
        sent: h.sent, bounced: h.bounced,
        date: new Date().toISOString(), status: h.status,
        createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Seeded ${historyData.length} sending history entries`);
  }

  console.log("Seeding audit logs...");
  const existingAudit = await db.select().from(auditLogs);
  if (existingAudit.length === 0) {
    const actions = [
      "Created campaign 'Q3 Newsletter'", "Extracted 23 emails from brightcaremedical.com",
      "Added 5 items to removal list", "Exported removal list as CSV",
      "Updated website brightcaremedical.com", "Sent campaign 'Welcome Series' to 450 recipients",
      "Logged in from new device", "Changed role permissions for Manager",
      "Exported report as XLSX", "Deleted campaign 'Test Campaign'",
    ];
    const entities = ["campaign", "website", "removal_list", "report", "user", "role"];
    const userIds = ["admin@intellilabs.com", "manager@intellilabs.com", "viewer@intellilabs.com"];
    for (let i = 0; i < 25; i++) {
      const d = new Date("2026-06-10"); d.setHours(d.getHours() - i * 3);
      await db.insert(auditLogs).values({
        id: String(i + 1), action: actions[i % actions.length],
        entityType: entities[i % entities.length], entityId: String(i + 100),
        userId: userIds[i % userIds.length],
        details: JSON.stringify({ description: `Auto-generated audit entry ${i + 1}` }),
        createdAt: d.toISOString(),
      });
    }
    console.log("  Seeded 25 audit logs");
  }

  console.log("Seed complete!");
}

runAll().catch((e) => { console.error("Seed failed:", e); process.exit(1); });

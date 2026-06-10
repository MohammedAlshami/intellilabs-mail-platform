import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const websites = sqliteTable("websites", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").default(""),
  category: text("category").default(""),
  isHealthcare: integer("is_healthcare", { mode: "boolean" }).default(false),
  emails: text("emails").default(""),
  phones: text("phones").default(""),
  description: text("description").default(""),
  summary: text("summary").default(""),
  services: text("services").default("[]"),
  scrapeStatus: text("scrape_status").default("idle"),
  createdAt: text("created_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").default(""),
  userId: text("user_id").default(""),
  details: text("details").default(""),
  createdAt: text("created_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  permissions: text("permissions").default("[]"),
  isLeader: integer("is_leader", { mode: "boolean" }).default(false),
  leadsRoles: text("leads_roles").default("[]"),
  createdAt: text("created_at").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  objective: text("objective").default(""),
  emailContent: text("email_content").default(""),
  recipients: integer("recipients").default(0),
  sent: integer("sent").default(0),
  bounced: integer("bounced").default(0),
  status: text("status").default("draft"),
  createdAt: text("created_at").notNull(),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  websiteId: text("website_id").notNull(),
  websiteName: text("website_name").default(""),
  type: text("type").notNull(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
});

export const bounceResponses = sqliteTable("bounce_responses", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  type: text("type").notNull(),
  reason: text("reason").default(""),
  confidence: real("confidence").default(0),
  received: text("received").notNull(),
  status: text("status").default("pending"),
  createdAt: text("created_at").notNull(),
});

export const removalList = sqliteTable("removal_list", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  source: text("source").default(""),
  reason: text("reason").default(""),
  flaggedAt: text("flagged_at").notNull(),
  status: text("status").default("pending"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").default(""),
  roleId: text("role_id").default(""),
  createdAt: text("created_at").notNull(),
});

export const campaignRecipients = sqliteTable("campaign_recipients", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  email: text("email").notNull(),
  status: text("status").default("sent"),
  responded: integer("responded", { mode: "boolean" }).default(false),
  sentiment: text("sentiment").default(""),
  responseText: text("response_text").default(""),
  sentAt: text("sent_at").default(""),
});

export const emailLists = sqliteTable("email_lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  emails: text("emails").notNull(),
  count: integer("count").default(0),
  source: text("source").default(""),
  createdAt: text("created_at").notNull(),
});

export const sendingHistory = sqliteTable("sending_history", {
  id: text("id").primaryKey(),
  campaign: text("campaign").notNull(),
  campaignId: text("campaign_id").default(""),
  recipients: integer("recipients").default(0),
  sent: integer("sent").default(0),
  bounced: integer("bounced").default(0),
  date: text("date").notNull(),
  status: text("status").default("sent"),
  createdAt: text("created_at").notNull(),
});

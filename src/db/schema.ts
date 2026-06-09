import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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

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

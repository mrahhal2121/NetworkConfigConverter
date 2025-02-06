import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const configFiles = pgTable("config_files", {
  id: serial("id").primaryKey(),
  originalContent: text("original_content").notNull(),
  convertedContent: text("converted_content").notNull(),
  metadata: jsonb("metadata").notNull().$type<{
    filename: string,
    uploadedAt: string,
    platform: "SAOS6" | "SAOS8"
  }>(),
});

export const insertConfigSchema = createInsertSchema(configFiles).pick({
  originalContent: true,
  convertedContent: true,
  metadata: true,
});

export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof configFiles.$inferSelect;

export const conversionRules = pgTable("conversion_rules", {
  id: serial("id").primaryKey(),
  saos6Pattern: text("saos6_pattern").notNull(),
  saos8Template: text("saos8_template").notNull(),
  description: text("description").notNull(),
});

export const insertRuleSchema = createInsertSchema(conversionRules).pick({
  saos6Pattern: true,
  saos8Template: true,
  description: true,
});

export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof conversionRules.$inferSelect;

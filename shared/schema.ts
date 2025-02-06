import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  originalFileName: text("original_filename").notNull(),
  originalConfig: text("original_config").notNull(),
  convertedConfig: text("converted_config").notNull(),
  metadata: jsonb("metadata").notNull()
});

export const insertConversionSchema = createInsertSchema(conversions).pick({
  originalFileName: true,
  originalConfig: true,
  convertedConfig: true,
  metadata: true
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

// File upload validation schema
export const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    "File size must be less than 5MB"
  )
});

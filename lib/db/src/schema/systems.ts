import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const systemsTable = pgTable("systems", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  status: text("status").notNull().default("offline"),
  lastPing: timestamp("last_ping", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemSchema = createInsertSchema(systemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systemsTable.$inferSelect;
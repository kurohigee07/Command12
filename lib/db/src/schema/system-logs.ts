import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const systemLogsTable = pgTable(
  "system_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    systemName: text("system_name").notNull(),
    eventType: text("event_type").notNull(),
    message: text("message"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_system_logs_created_at").on(table.createdAt),
    index("idx_system_logs_system_name").on(table.systemName),
  ],
);

export const insertSystemLogSchema = createInsertSchema(systemLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogsTable.$inferSelect;
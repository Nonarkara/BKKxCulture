import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pageviews = sqliteTable(
  "pageviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    path: text("path").notNull(),
    referrer: text("referrer"),
    country: text("country"),
    language: text("language"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_pageviews_created_at").on(table.createdAt)],
);

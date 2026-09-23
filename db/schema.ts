import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  clinic: text("clinic").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull(),
  priority: text("priority").notNull(),
  notes: text("notes").notNull().default(""),
  created: text("created").notNull(),
});
export const supplies = sqliteTable("supplies", {
  id: text("id").primaryKey(),
  donor: text("donor").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull(),
  created: text("created").notNull(),
});
export const shipments = sqliteTable(
  "shipments",
  {
    id: text("id").primaryKey(),
    request_id: text("request_id")
      .notNull()
      .references(() => requests.id),
    supply_id: text("supply_id")
      .notNull()
      .references(() => supplies.id),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("Allocated"),
    created: text("created").notNull(),
  },
  (t) => [
    index("idx_shipments_request").on(t.request_id),
    index("idx_shipments_supply").on(t.supply_id),
  ],
);

import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Taxi drivers (users) ─────────────────────────────────────────────────────
export const taxiUsers = pgTable("taxi_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  israelId: text("israel_id").unique(),
  deviceId: text("device_id"),
  status: text("status", { enum: ["pending", "active", "expired"] })
    .notNull()
    .default("pending"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTaxiUserSchema = createInsertSchema(taxiUsers).omit({
  id: true,
  registeredAt: true,
  updatedAt: true,
});

export type TaxiUser = typeof taxiUsers.$inferSelect;
export type InsertTaxiUser = z.infer<typeof insertTaxiUserSchema>;

// ── Admin TOTP ───────────────────────────────────────────────────────────────
export const adminTotp = pgTable("admin_totp", {
  id: uuid("id").primaryKey().defaultRandom(),
  secret: text("secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AdminTotp = typeof adminTotp.$inferSelect;

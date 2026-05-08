import { pgTable, serial, timestamp, varchar, numeric, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const projects = pgTable("projects", {
	id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
	name: varchar("name", { length: 128 }).notNull(),
	destination: varchar("destination", { length: 128 }).notNull(),
	start_date: varchar("start_date", { length: 32 }),
	end_date: varchar("end_date", { length: 32 }),
	total_amount: numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
	participants: jsonb("participants"),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
	index("projects_created_at_idx").on(table.created_at),
]);

export const bills = pgTable("bills", {
	id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
	project_id: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 128 }).notNull(),
	category: varchar("category", { length: 32 }).notNull().default("other"),
	amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
	payer: varchar("payer", { length: 64 }).notNull(),
	is_treat: boolean("is_treat").default(false).notNull(),
	bill_date: varchar("bill_date", { length: 32 }),
	participants: jsonb("participants"),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("bills_project_id_idx").on(table.project_id),
	index("bills_bill_date_idx").on(table.bill_date),
	index("bills_category_idx").on(table.category),
]);

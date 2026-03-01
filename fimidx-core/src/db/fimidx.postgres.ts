import { drizzle } from "drizzle-orm/node-postgres";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { getCoreConfig } from "../common/getCoreConfig.js";

const { postgres } = getCoreConfig();

export const fimidxPostgresDb = drizzle(postgres.url);

// IObj schema
export const objs = pgTable("objs", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
  createdByType: text("created_by_type").notNull(),
  projectId: text("project_id").notNull(),
  groupId: text("group_id").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").notNull(),
  updatedByType: text("updated_by_type").notNull(),
  tag: text("tag").notNull(),
  objRecord: jsonb("obj_record").notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
  deletedByType: text("deleted_by_type"),
  shouldIndex: boolean("should_index").notNull().default(true),
  fieldsToIndex: jsonb("fields_to_index").$type<string[]>(),
});

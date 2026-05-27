import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

/** Inlined from common/indexer to avoid module resolution issues when loaded by drizzle-kit */
type FieldType = "string" | "number" | "boolean" | "null" | "undefined";

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

export const emailRecords = pgTable("emailRecord", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  params: jsonb("params").$type<Record<string, unknown>>(),
  provider: text("provider").notNull(),
  response: text("response"),
  senderError: text("senderError"),
  serverError: text("serverError"),
  callerId: text("callerId"),
});

export const emailBlockLists = pgTable("emailBlockList", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  email: text("email").notNull(),
  justifyingEmailRecordId: text("justifyingEmailRecordId").references(
    () => emailRecords.id,
    { onDelete: "cascade" }
  ),
  reason: text("reason"),
});

export const objFields = pgTable("objField", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  projectId: text("projectId").notNull(),
  groupId: text("groupId").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  arrayTypes: jsonb("arrayTypes").$type<FieldType[]>().notNull(),
  isArrayCompressed: boolean("isArrayCompressed").notNull(),
  tag: text("tag").notNull(),
});

/**
 * Turso/SQLite fimidx schema used only by migrateFimidxTursoToPostgres.ts.
 */
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

type FieldType = "string" | "number" | "boolean" | "null" | "undefined";

export const emailRecords = sqliteTable("emailRecord", {
  id: text("id").primaryKey().notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  params: text("params", { mode: "json" }).$type<Record<string, unknown>>(),
  provider: text("provider").notNull(),
  response: text("response"),
  senderError: text("senderError"),
  serverError: text("serverError"),
  callerId: text("callerId"),
});

export const emailBlockLists = sqliteTable("emailBlockList", {
  id: text("id").primaryKey().notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  email: text("email").notNull(),
  justifyingEmailRecordId: text("justifyingEmailRecordId"),
  reason: text("reason"),
});

export const objFields = sqliteTable("objField", {
  id: text("id").primaryKey().notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  projectId: text("projectId").notNull(),
  groupId: text("groupId").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  arrayTypes: text("arrayTypes", { mode: "json" })
    .$type<FieldType[]>()
    .notNull(),
  isArrayCompressed: integer("isArrayCompressed", {
    mode: "boolean",
  }).notNull(),
  tag: text("tag").notNull(),
});

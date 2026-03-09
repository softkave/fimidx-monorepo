import type { AnyObject } from "softkave-js-utils";
import { z } from "zod";
import type { FieldType } from "../common/indexer.js";
import { durationSchema } from "./other.js";

export const kObjTags = {
  obj: "obj",
  log: "log",
  callback: "callback",
  callbackExecution: "callbackExecution",
  group: "group",
  clientToken: "clientToken",
  member: "member",
  project: "project",
  monitor: "monitor",
  permission: "permission",
} as const;

export type ObjTag = (typeof kObjTags)[keyof typeof kObjTags];

/** Short form of each tag (4 letters), used as prefix for obj ids (e.g. project -> "proj", member -> "memb"). */
export const kObjTagShortForms: Record<ObjTag, string> = {
  [kObjTags.obj]: "obje",
  [kObjTags.log]: "logs",
  [kObjTags.callback]: "call",
  [kObjTags.callbackExecution]: "cbex",
  [kObjTags.group]: "grou",
  [kObjTags.clientToken]: "ctok",
  [kObjTags.member]: "memb",
  [kObjTags.project]: "proj",
  [kObjTags.monitor]: "moni",
  [kObjTags.permission]: "perm",
} as const;

/** Separator between tag short form and the rest of the id (e.g. "proj_01933..."). */
export const kObjIdPrefixSeparator = "_";

/**
 * Returns the short form for a tag. Known tags use kObjTagShortForms; unknown tags are returned as-is.
 */
export function getObjTagShortForm(tag: string): string {
  return (kObjTagShortForms as Record<string, string>)[tag] ?? tag;
}

/**
 * Prefixes an id with the tag's short form when creating objs. Ids look like "{shortForm}_{id}".
 */
export function prefixObjId(tag: string, id: string): string {
  const shortForm = getObjTagShortForm(tag);
  return `${shortForm}${kObjIdPrefixSeparator}${id}`;
}

export type IObjField = {
  id: string;
  /**
   * dot separated list of keys, and for array fields, the index of the array
   * element or a '[*]' wildcard for all elements.
   *
   * For example:
   * - "primary"
   * - "content.name"
   * - "content.scores[0]"
   * - "content.scores[*]"
   * - "content.tags[0].name"
   * - "content.tags[*].name"
   *
   * `path` will not include `objRecord`, but its content. For example,
   * `objRecord.content.tags[0].name` will be `content.tags[0].name`.
   */
  path: string;
  type: FieldType;
  arrayTypes: FieldType[];
  isArrayCompressed: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  groupId: string;
  tag: string;
};

export type IObj = {
  id: string;
  createdAt: Date;
  createdBy: string;
  createdByType: string;
  projectId: string;
  groupId: string;
  updatedAt: Date;
  updatedBy: string;
  updatedByType: string;
  tag: string;
  objRecord: AnyObject;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletedByType: string | null;
  shouldIndex: boolean;
  fieldsToIndex: string[] | null;
};

export const inputObjRecordSchema = z.record(z.string().min(1), z.any());
export const inputObjRecordArraySchema = z.array(inputObjRecordSchema);
export const onConflictSchema = z
  .enum([
    "replace",
    "merge",
    "mergeButConcatArrays",
    "mergeButKeepArrays",
    "mergeButReplaceArrays",
    "ignore",
    "fail",
  ])
  .default("replace");

export const setManyObjsSchema = z.object({
  projectId: z.string().min(1),
  items: inputObjRecordArraySchema.min(1).max(100),
  onConflict: onConflictSchema.optional(),
  /**
   * fields to check for conflicts. Only applies to contained fields within
   * `objRecord`.
   */
  conflictOnKeys: z.array(z.string().min(1)).optional(),
  shouldIndex: z.boolean().optional(),
  /**
   * fields to index. Only applies to contained fields within `objRecord`.
   */
  fieldsToIndex: z.array(z.string().min(1)).optional(),
});

export const objPartQueryItemOpSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "in",
  "not_in",
  "between",
  "exists",
]);

export const objPartQueryItemNumberValueSchema = z.union([
  z.number(),
  z.string().datetime(),
  durationSchema,
]);

export const objPartQueryItemSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("eq"),
    /**
     * {@see IObjField.path}
     */
    field: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({
    op: z.literal("neq"),
    field: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    op: z.literal("gt"),
    field: z.string(),
    value: objPartQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("gte"),
    field: z.string(),
    value: objPartQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("lt"),
    field: z.string(),
    value: objPartQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("lte"),
    field: z.string(),
    value: objPartQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("like"),
    field: z.string(),
    // TODO: how should we handle regex and potential DOS attacks from regex
    // that runs for too long?
    value: z.string(),
    caseSensitive: z.boolean().optional(),
  }),
  z.object({
    op: z.literal("in"),
    field: z.string(),
    value: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .max(100),
  }),
  z.object({
    op: z.literal("not_in"),
    field: z.string(),
    value: z
      .array(z.union([z.string(), z.number()]))
      .min(1)
      .max(100),
  }),
  z.object({
    op: z.literal("between"),
    field: z.string(),
    value: z.tuple([
      objPartQueryItemNumberValueSchema,
      objPartQueryItemNumberValueSchema,
    ]),
  }),
  z.object({
    op: z.literal("exists"),
    field: z.string(),
    value: z.boolean(),
  }),
]);

export const objPartQueryListSchema = z.array(objPartQueryItemSchema);
export const objPartLogicalQuerySchema = z.object({
  and: objPartQueryListSchema.optional(),
  or: objPartQueryListSchema.optional(),
});

export const stringMetaQuerySchema = z.object({
  eq: z.string().optional(),
  neq: z.string().optional(),
  in: z.array(z.string()).optional(),
  not_in: z.array(z.string()).optional(),
});

export const numberMetaQuerySchema = z.object({
  eq: z.union([z.number(), z.string().datetime()]).optional(),
  neq: z.union([z.number(), z.string().datetime()]).optional(),
  in: z.array(z.union([z.number(), z.string().datetime()])).optional(),
  not_in: z.array(z.union([z.number(), z.string().datetime()])).optional(),
  gt: objPartQueryItemNumberValueSchema.optional(),
  gte: objPartQueryItemNumberValueSchema.optional(),
  lt: objPartQueryItemNumberValueSchema.optional(),
  lte: objPartQueryItemNumberValueSchema.optional(),
  between: z
    .tuple([
      objPartQueryItemNumberValueSchema,
      objPartQueryItemNumberValueSchema,
    ])
    .optional(),
});

export const objMetaQuerySchema = z.object({
  id: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
});

// New schema for top-level field queries
export const topLevelFieldQuerySchema = z.object({
  shouldIndex: z.boolean().optional(),
  /**
   * {@see IObjField.path}
   */
  fieldsToIndex: z.array(z.string()).optional(),
  tag: stringMetaQuerySchema.optional(),
  groupId: stringMetaQuerySchema.optional(),
  deletedAt: z.union([z.null(), numberMetaQuerySchema]).optional(),
  deletedBy: stringMetaQuerySchema.optional(),
  deletedByType: stringMetaQuerySchema.optional(),
});

// TODO: projectId shouldn't be optional for external use
export const objQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  partQuery: objPartLogicalQuerySchema.optional(),
  metaQuery: objMetaQuerySchema.optional(),
  topLevelFields: topLevelFieldQuerySchema.optional(),
});

export const objSortSchema = z.object({
  /**
   * {@see IObjField.path}
   */
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export const objSortListSchema = z.array(objSortSchema);
export const updateManyObjsSchema = z.object({
  query: objQuerySchema,
  update: inputObjRecordSchema,
  updateMany: z.boolean().optional(),
  updateWay: onConflictSchema.optional(),
  /**
   * {@see IObjField.path}
   */
  fieldsToIndex: z.array(z.string().min(1)).optional(),
  shouldIndex: z.boolean().optional(),
  count: z.number().optional(),
});

export const deleteManyObjsSchema = z.object({
  query: objQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const getManyObjsSchema = z.object({
  query: objQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const getObjFieldsSchema = z.object({
  projectId: z.string().min(1),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const getObjFieldValuesSchema = z.object({
  projectId: z.string().min(1),
  field: z.string().min(1),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export type IInputObjRecord = z.infer<typeof inputObjRecordSchema>;
export type IInputObjRecordArray = z.infer<typeof inputObjRecordArraySchema>;
export type IObjPartQueryItemNumberValue = z.infer<
  typeof objPartQueryItemNumberValueSchema
>;
export type IObjPartQueryItem = z.infer<typeof objPartQueryItemSchema>;
export type IObjPartQueryList = z.infer<typeof objPartQueryListSchema>;
export type IObjPartLogicalQuery = z.infer<typeof objPartLogicalQuerySchema>;
export type IStringMetaQuery = z.infer<typeof stringMetaQuerySchema>;
export type INumberMetaQuery = z.infer<typeof numberMetaQuerySchema>;
export type IObjMetaQuery = z.infer<typeof objMetaQuerySchema>;
export type ITopLevelFieldQuery = z.infer<typeof topLevelFieldQuerySchema>;
export type IObjQuery = z.infer<typeof objQuerySchema>;
export type IObjSort = z.infer<typeof objSortSchema>;
export type IObjSortList = z.infer<typeof objSortListSchema>;
export type OnConflict = z.infer<typeof onConflictSchema>;

export type ISetManyObjsEndpointArgs = z.infer<typeof setManyObjsSchema>;
export type IUpdateManyObjsEndpointArgs = z.infer<typeof updateManyObjsSchema>;
export type IDeleteManyObjsEndpointArgs = z.infer<typeof deleteManyObjsSchema>;
export type IGetManyObjsEndpointArgs = z.infer<typeof getManyObjsSchema>;
export type IGetObjFieldsEndpointArgs = z.infer<typeof getObjFieldsSchema>;
export type IGetObjFieldValuesEndpointArgs = z.infer<
  typeof getObjFieldValuesSchema
>;

export interface ISetManyObjsEndpointResponse {
  newObjs: IObj[];
  updatedObjs: IObj[];
  ignoredItems: IInputObjRecord[];
  failedItems: IInputObjRecord[];
}

export interface IGetManyObjsEndpointResponse {
  objs: IObj[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IGetObjFieldsEndpointResponse {
  fields: IObjField[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IGetObjFieldValuesEndpointResponse {
  values: { value: string; type: string }[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IUpdateManyObjsEndpointResponse {
  success: boolean;
}

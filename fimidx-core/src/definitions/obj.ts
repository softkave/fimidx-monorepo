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
  alert: "alert",
  monitorRun: "monitorRun",
  objField: "objField",
  user: "user",
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
  [kObjTags.alert]: "aler",
  [kObjTags.monitorRun]: "mrun",
  [kObjTags.objField]: "objf",
  [kObjTags.user]: "user",
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
export function prefixObjId(tag: ObjTag, id: string): string {
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
   * - "content.scores[*]"
   * - "content.tags[*].name"
   *
   * `path` will not include `objRecord`, but its content. For example,
   * `objRecord.content.tags[*].name` will be `content.tags[*].name`.
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
/** Max 1000 items per request (e.g. log ingest); callers may further restrict. */
export const inputObjRecordArraySchema = z
  .array(inputObjRecordSchema)
  .max(1000);
export const onConflictSchema = z
  .enum([
    "replace",
    "shallowMerge",
    "deepMerge",
    "shallowMergeButConcatArrays",
    "deepMergeButConcatArrays",
    "shallowMergeButKeepArrays",
    "deepMergeButKeepArrays",
    "shallowMergeButReplaceArrays",
    "deepMergeButReplaceArrays",
    "ignore",
    "fail",
    // Backwards compatibility - deprecated, use deepMerge variants instead
    "merge",
    "mergeButConcatArrays",
    "mergeButKeepArrays",
    "mergeButReplaceArrays",
  ])
  .default("shallowMerge");

export const granularUpdateSchema = z.object({
  key: z.string().optional(),
  value: z.any(),
  updateWay: onConflictSchema.optional(),
});

export const granularUpdatesSchema = z.array(granularUpdateSchema);

export const setManyObjsSchema = z.object({
  projectId: z.string().min(1),
  items: inputObjRecordArraySchema.min(1),
  onConflict: onConflictSchema.optional(),
  /**
   * fields to check for conflicts. Only applies to contained fields within
   * `objRecord`.
   */
  conflictOnKeys: z.array(z.string().min(1)).max(50).optional(),
  shouldIndex: z.boolean().optional(),
  /**
   * fields to index. Only applies to contained fields within `objRecord`.
   */
  fieldsToIndex: z.array(z.string().min(1)).max(50).optional(),
});

export const objRecordQueryItemOpSchema = z.enum([
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

export const objRecordQueryItemNumberValueSchema = z.union([
  z.number(),
  z.string().datetime(),
  durationSchema,
]);

export const objRecordQueryItemSchema = z.discriminatedUnion("op", [
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
    value: objRecordQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("gte"),
    field: z.string(),
    value: objRecordQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("lt"),
    field: z.string(),
    value: objRecordQueryItemNumberValueSchema,
  }),
  z.object({
    op: z.literal("lte"),
    field: z.string(),
    value: objRecordQueryItemNumberValueSchema,
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
      objRecordQueryItemNumberValueSchema,
      objRecordQueryItemNumberValueSchema,
    ]),
  }),
  z.object({
    op: z.literal("exists"),
    field: z.string(),
    value: z.boolean(),
  }),
]);

/** Max 100 record conditions per leaf query (implicit AND across items). */
export const objRecordQueryListSchema = z
  .array(objRecordQueryItemSchema)
  .max(100);

export const stringMetaQuerySchema = z.object({
  eq: z.string().optional(),
  neq: z.string().optional(),
  in: z.array(z.string()).max(100).optional(),
  not_in: z.array(z.string()).max(100).optional(),
});

export const numberMetaQuerySchema = z.object({
  eq: z.union([z.number(), z.string().datetime()]).optional(),
  neq: z.union([z.number(), z.string().datetime()]).optional(),
  in: z
    .array(z.union([z.number(), z.string().datetime()]))
    .max(100)
    .optional(),
  not_in: z
    .array(z.union([z.number(), z.string().datetime()]))
    .max(100)
    .optional(),
  gt: objRecordQueryItemNumberValueSchema.optional(),
  gte: objRecordQueryItemNumberValueSchema.optional(),
  lt: objRecordQueryItemNumberValueSchema.optional(),
  lte: objRecordQueryItemNumberValueSchema.optional(),
  between: z
    .tuple([
      objRecordQueryItemNumberValueSchema,
      objRecordQueryItemNumberValueSchema,
    ])
    .optional(),
});

/** Meta keys: applied via transformMetaQuery (path mapping). */
const META_QUERY_KEYS = new Set([
  "projectId",
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "createdByType",
  "updatedByType",
  "deletedAt",
  "deletedBy",
  "deletedByType",
]);

/** Top-level keys: applied via transformTopLevelFields (direct field names). */
export const TOP_LEVEL_QUERY_KEYS = new Set([
  "shouldIndex",
  "fieldsToIndex",
  "tag",
  "groupId",
]);

/**
 * Merged meta + top-level query schema. Storage layer splits by META_QUERY_KEYS
 * vs TOP_LEVEL_QUERY_KEYS when building the filter.
 */
export const objMetaQuerySchema = z.object({
  projectId: stringMetaQuerySchema.optional(),
  id: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  createdByType: stringMetaQuerySchema.optional(),
  updatedByType: stringMetaQuerySchema.optional(),
  deletedAt: z.union([z.null(), numberMetaQuerySchema]).optional(),
  deletedBy: stringMetaQuerySchema.optional(),
  deletedByType: stringMetaQuerySchema.optional(),
  shouldIndex: z.boolean().optional(),
  /**
   * {@see IObjField.path}
   */
  fieldsToIndex: z.array(z.string()).max(50).optional(),
  tag: stringMetaQuerySchema.optional(),
  groupId: stringMetaQuerySchema.optional(),
});

export { META_QUERY_KEYS };

/**
 * A single leaf query: flat recordQuery (implicit AND across items) plus merged
 * metaQuery.
 */
export const objQueryLeafSchema = z.object({
  recordQuery: objRecordQueryListSchema.optional(),
  metaQuery: objMetaQuerySchema.optional(),
});

export type IObjQueryLeaf = z.infer<typeof objQueryLeafSchema>;

export interface IObjQueryLogical {
  and?: IObjQueryBranch[];
  or?: IObjQueryBranch[];
}

export type IObjQueryBranch = IObjQueryLeaf | IObjQueryLogical;

export const objQueryLogicalSchema: z.ZodType<IObjQueryLogical> = z.lazy(() =>
  z.object({
    and: z
      .array(z.union([objQueryLeafSchema, objQueryLogicalSchema]))
      .max(100)
      .optional(),
    or: z
      .array(z.union([objQueryLeafSchema, objQueryLogicalSchema]))
      .max(100)
      .optional(),
  })
);

/**
 * Internal storage query schema.
 *
 * Convenience: callers may provide a single leaf directly. Use logical and/or
 * only when composition is needed.
 */
export const objQuerySchema = z.union([
  objQueryLeafSchema,
  objQueryLogicalSchema,
]);

/**
 * External API metaQuery schema: excludes projectId, groupId, and tag since
 * these are container/scope fields provided at the top level of external API
 * requests rather than as query conditions.
 */
export const objExternalApiMetaQuerySchema = z.object({
  id: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  createdByType: stringMetaQuerySchema.optional(),
  updatedByType: stringMetaQuerySchema.optional(),
  deletedAt: z.union([z.null(), numberMetaQuerySchema]).optional(),
  deletedBy: stringMetaQuerySchema.optional(),
  deletedByType: stringMetaQuerySchema.optional(),
  shouldIndex: z.boolean().optional(),
  fieldsToIndex: z.array(z.string()).max(50).optional(),
});

export const objExternalApiQueryLeafSchema = z.object({
  recordQuery: objRecordQueryListSchema.optional(),
  metaQuery: objExternalApiMetaQuerySchema.optional(),
});

export type IObjExternalApiQueryLeaf = z.infer<
  typeof objExternalApiQueryLeafSchema
>;

export interface IObjExternalApiQueryLogical {
  and?: IObjExternalApiQueryBranch[];
  or?: IObjExternalApiQueryBranch[];
}

export type IObjExternalApiQueryBranch =
  | IObjExternalApiQueryLeaf
  | IObjExternalApiQueryLogical;

export const objExternalApiQueryLogicalSchema: z.ZodType<IObjExternalApiQueryLogical> =
  z.lazy(() =>
    z.object({
      and: z
        .array(
          z.union([
            objExternalApiQueryLeafSchema,
            objExternalApiQueryLogicalSchema,
          ])
        )
        .max(100)
        .optional(),
      or: z
        .array(
          z.union([
            objExternalApiQueryLeafSchema,
            objExternalApiQueryLogicalSchema,
          ])
        )
        .max(100)
        .optional(),
    })
  );

/**
 * External API query schema: does not include projectId, groupId, or tag in
 * metaQuery. These scope fields are provided separately at the endpoint level.
 */
export const objExternalApiQuerySchema = z.union([
  objExternalApiQueryLeafSchema,
  objExternalApiQueryLogicalSchema,
]);

export type IObjExternalApiQuery = z.infer<typeof objExternalApiQuerySchema>;

/** Type guard for external API query leaf. */
export function isObjExternalApiQueryLeaf(
  query: IObjExternalApiQueryBranch
): query is IObjExternalApiQueryLeaf {
  return (
    typeof query === "object" &&
    query !== null &&
    !(
      "and" in query &&
      Array.isArray((query as IObjExternalApiQueryLogical).and)
    ) &&
    !("or" in query && Array.isArray((query as IObjExternalApiQueryLogical).or))
  );
}

/**
 * Converts an external API query to an internal query by injecting projectId,
 * groupId, and tag into each leaf's metaQuery.
 */
export function externalApiQueryToInternalQuery(
  externalQuery: IObjExternalApiQueryBranch | undefined,
  scope: { projectId: string; groupId?: string; tag: string }
): IObjQueryBranch {
  const scopeMetaQuery: IObjMetaQuery = {
    projectId: { eq: scope.projectId },
    tag: { eq: scope.tag },
    ...(scope.groupId && { groupId: { eq: scope.groupId } }),
  };

  if (!externalQuery) {
    return { metaQuery: scopeMetaQuery };
  }

  if (isObjExternalApiQueryLeaf(externalQuery)) {
    return {
      recordQuery: externalQuery.recordQuery,
      metaQuery: { ...scopeMetaQuery, ...externalQuery.metaQuery },
    };
  }

  const logical = externalQuery as IObjExternalApiQueryLogical;
  const result: IObjQueryLogical = {};

  if (logical.and) {
    result.and = logical.and.map((branch) =>
      externalApiQueryToInternalQuery(branch, scope)
    );
  }
  if (logical.or) {
    result.or = logical.or.map((branch) =>
      externalApiQueryToInternalQuery(branch, scope)
    );
  }

  return result;
}

export const objSortSchema = z.object({
  /**
   * {@see IObjField.path}
   */
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

/** Max 20 sort fields per request. */
export const objSortListSchema = z.array(objSortSchema).max(20);

export const updateManyObjsSchema = z
  .object({
    query: objQuerySchema,
    update: inputObjRecordSchema.optional(),
    updates: granularUpdatesSchema.optional(),
    updateMany: z.boolean().optional(),
    updateWay: onConflictSchema.optional(),
    /**
     * {@see IObjField.path}
     */
    fieldsToIndex: z.array(z.string().min(1)).max(50).optional(),
    shouldIndex: z.boolean().optional(),
    count: z.number().optional(),
  })
  .refine((data) => data.update || data.updates, {
    message: "Either update or updates must be provided",
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

/**
 * External API schemas: projectId is top-level, query uses
 * objExternalApiQuerySchema which excludes projectId, groupId, and tag from
 * metaQuery.
 */
export const getManyObjsExternalApiSchema = z.object({
  projectId: z.string().min(1),
  query: objExternalApiQuerySchema.optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const updateManyObjsExternalApiSchema = z
  .object({
    projectId: z.string().min(1),
    query: objExternalApiQuerySchema.optional(),
    update: inputObjRecordSchema.optional(),
    updates: granularUpdatesSchema.optional(),
    updateWay: onConflictSchema.optional(),
    fieldsToIndex: z.array(z.string().min(1)).max(50).optional(),
    shouldIndex: z.boolean().optional(),
    count: z.number().optional(),
  })
  .refine((data) => data.update || data.updates, {
    message: "Either update or updates must be provided",
  });

export const deleteManyObjsExternalApiSchema = z.object({
  projectId: z.string().min(1),
  query: objExternalApiQuerySchema.optional(),
  deleteMany: z.boolean().optional(),
});

export type IGetManyObjsExternalApiArgs = z.infer<
  typeof getManyObjsExternalApiSchema
>;
export type IUpdateManyObjsExternalApiArgs = z.infer<
  typeof updateManyObjsExternalApiSchema
>;
export type IDeleteManyObjsExternalApiArgs = z.infer<
  typeof deleteManyObjsExternalApiSchema
>;

export type IInputObjRecord = z.infer<typeof inputObjRecordSchema>;
export type IInputObjRecordArray = z.infer<typeof inputObjRecordArraySchema>;
export type IObjRecordQueryItemNumberValue = z.infer<
  typeof objRecordQueryItemNumberValueSchema
>;
export type IObjRecordQueryItem = z.infer<typeof objRecordQueryItemSchema>;
export type IObjRecordQueryList = z.infer<typeof objRecordQueryListSchema>;
export type IStringMetaQuery = z.infer<typeof stringMetaQuerySchema>;
export type INumberMetaQuery = z.infer<typeof numberMetaQuerySchema>;
export type IObjMetaQuery = z.infer<typeof objMetaQuerySchema>;
/** @deprecated Use IObjMetaQuery; kept for compatibility. */
export type ITopLevelFieldQuery = IObjMetaQuery;
export type IObjQuery = z.infer<typeof objQuerySchema>;

/**
 * Resolves projectId from merged metaQuery for field resolution (e.g. getObjs,
 * deleteObjs). Returns the string value when projectId is { eq: x } or a plain
 * string.
 */
export function getProjectIdFromMetaQuery(
  metaQuery: IObjMetaQuery | undefined
): string | undefined {
  if (!metaQuery?.projectId) return undefined;
  const p = metaQuery.projectId;
  if (typeof p === "string") return p;
  if (typeof p === "object" && p !== null && "eq" in p && p.eq != null)
    return p.eq;
  if (
    typeof p === "object" &&
    p !== null &&
    "in" in p &&
    Array.isArray(p.in) &&
    p.in[0] != null
  )
    return p.in[0];
  return undefined;
}

/** Type guard: query is a leaf (has recordQuery and/or metaQuery, not and/or). */
export function isObjQueryLeaf(query: IObjQueryBranch): query is IObjQueryLeaf {
  return (
    typeof query === "object" &&
    query !== null &&
    !("and" in query && Array.isArray((query as IObjQueryLogical).and)) &&
    !("or" in query && Array.isArray((query as IObjQueryLogical).or))
  );
}

/**
 * Resolves projectId from the first leaf of an obj query (for field resolution).
 */
export function getProjectIdFromObjQuery(
  query: IObjQueryBranch | undefined
): string | undefined {
  if (!query) return undefined;
  if (isObjQueryLeaf(query)) return getProjectIdFromMetaQuery(query.metaQuery);
  const logical = query as IObjQueryLogical;
  const firstBranch = logical.and?.[0] ?? logical.or?.[0];
  if (!firstBranch) return undefined;
  return getProjectIdFromObjQuery(firstBranch as IObjQueryBranch);
}

export type IObjSort = z.infer<typeof objSortSchema>;
export type IObjSortList = z.infer<typeof objSortListSchema>;
export type OnConflict = z.infer<typeof onConflictSchema>;
export type IGranularUpdate = z.infer<typeof granularUpdateSchema>;
export type IGranularUpdates = z.infer<typeof granularUpdatesSchema>;

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

/**
 * When `projection` is omitted, callers get the full resource type `T`.
 * When provided, `id` is always required and every other projected field is
 * optional (Mongo may omit missing paths). Converters (`objTo*`) accept
 * partial objs and cast to `T`; get* helpers cast to this projected shape.
 */
export type ProjectedResource<
  T extends { id: string },
  P extends readonly (keyof T)[] | undefined,
> = [P] extends [undefined]
  ? T
  : P extends readonly (keyof T)[]
    ? { id: string } & Partial<Pick<T, Exclude<P[number], "id">>>
    : T;

/** Standard IObj meta fields shared by most resources. */
export const kObjTopLevelFields = new Set<string>([
  "id",
  "createdAt",
  "updatedAt",
  "groupId",
  "projectId",
  "createdBy",
  "createdByType",
  "updatedBy",
  "updatedByType",
]);

export type ResourceProjectionOptions = {
  topLevelFields?: ReadonlySet<string>;
  /** Resource field → storage field (e.g. project `orgId` → `groupId`). */
  fieldAliases?: Record<string, string>;
};

/**
 * Map resource field names to a Mongo projection (always includes `id`).
 * Fields in `topLevelFields` are projected at the document root; others under
 * `objRecord.*`.
 */
export function resourceFieldsToMongoProjection(
  fields: readonly string[],
  options?: ResourceProjectionOptions
): Record<string, 0 | 1> {
  const topLevelFields = options?.topLevelFields ?? kObjTopLevelFields;
  const fieldAliases = options?.fieldAliases;
  const projection: Record<string, 0 | 1> = { id: 1, _id: 0 };
  for (const field of fields) {
    if (field === "id") continue;
    const sourceField = fieldAliases?.[field] ?? field;
    if (topLevelFields.has(sourceField)) {
      projection[sourceField] = 1;
    } else {
      projection[`objRecord.${sourceField}`] = 1;
    }
  }
  return projection;
}

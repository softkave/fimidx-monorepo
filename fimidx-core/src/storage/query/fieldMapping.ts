// Centralized field mapping from camelCase to snake_case
export const FIELD_MAP: Record<string, string> = {
  // Top-level IObj fields
  id: "id",
  createdAt: "created_at",
  createdBy: "created_by",
  createdByType: "created_by_type",
  projectId: "project_id",
  groupId: "group_id",
  updatedAt: "updated_at",
  updatedBy: "updated_by",
  updatedByType: "updated_by_type",
  tag: "tag",
  objRecord: "obj_record",
  deletedAt: "deleted_at",
  deletedBy: "deleted_by",
  deletedByType: "deleted_by_type",
  shouldIndex: "should_index",
  fieldsToIndex: "fields_to_index",
};

/**
 * Converts a camelCase field name to its corresponding snake_case database column name
 */
export function mapFieldToDbColumn(field: string): string {
  return FIELD_MAP[field] || field;
}

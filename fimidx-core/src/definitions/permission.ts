import { z } from "zod";
import {
  numberMetaQuerySchema,
  objPartQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export const kFimidxPermissions = {
  wildcard: "*",
  group: {
    read: "group:read",
    mutate: "group:mutate",
    delete: "group:delete",
  },
  project: {
    read: "project:read",
    mutate: "project:mutate",
    delete: "project:delete",
  },
  member: {
    read: "member:read",
    readPermissions: "member:readPermissions",
    mutate: "member:mutate",
    remove: "member:remove",
  },
  log: {
    read: "log:read",
    ingest: "log:ingest",
  },
  clientToken: {
    read: "clientToken:read",
    readPermissions: "clientToken:readPermissions",
    mutate: "clientToken:mutate",
    delete: "clientToken:delete",
  },
  monitor: {
    read: "monitor:read",
    mutate: "monitor:mutate",
    delete: "monitor:delete",
  },
  callback: {
    read: "callback:read",
    mutate: "callback:mutate",
    delete: "callback:delete",
  },
  obj: {
    read: "obj:read",
    mutate: "obj:mutate",
    delete: "obj:delete",
  },
  permission: {
    read: "permission:read",
    mutate: "permission:mutate",
    delete: "permission:delete",
  },
};

export const kFimidxPermissionsList = [
  kFimidxPermissions.wildcard,
  kFimidxPermissions.group.read,
  kFimidxPermissions.group.mutate,
  kFimidxPermissions.group.delete,
  kFimidxPermissions.project.read,
  kFimidxPermissions.project.mutate,
  kFimidxPermissions.project.delete,
  kFimidxPermissions.member.read,
  kFimidxPermissions.member.readPermissions,
  kFimidxPermissions.member.mutate,
  kFimidxPermissions.member.remove,
  kFimidxPermissions.log.read,
  kFimidxPermissions.log.ingest,
  kFimidxPermissions.clientToken.read,
  kFimidxPermissions.clientToken.readPermissions,
  kFimidxPermissions.clientToken.mutate,
  kFimidxPermissions.clientToken.delete,
  kFimidxPermissions.monitor.read,
  kFimidxPermissions.monitor.mutate,
  kFimidxPermissions.monitor.delete,
  kFimidxPermissions.callback.read,
  kFimidxPermissions.callback.mutate,
  kFimidxPermissions.callback.delete,
  kFimidxPermissions.obj.read,
  kFimidxPermissions.obj.mutate,
  kFimidxPermissions.obj.delete,
];

export type IPermissionEntity = Record<string, string> | string;
export type IPermissionAction = Record<string, string> | string;
export type IPermissionTarget = Record<string, string> | string;

export type IPermissionAtom = {
  entity: IPermissionEntity;
  action: IPermissionAction;
  target: IPermissionTarget;
  /** When true, this atom grants the permission; when false, it denies. Default true for backward compatibility. */
  granted?: boolean;
};

export type IPermissionMeta = Record<string, string> | null;

export interface IPermission extends IPermissionAtom {
  id: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByType: string;
  updatedBy: string;
  updatedByType: string;
  projectId: string;
  groupId: string;
  meta?: IPermissionMeta;
}

export interface IPermissionObjRecord {
  entity: IPermissionEntity;
  action: IPermissionAction;
  target: IPermissionTarget;
  granted?: boolean;
  description?: string | null;
  meta?: IPermissionMeta;
}

export const entitySchema = z
  .record(z.string().min(1), z.string())
  .or(z.string().min(1));
export const actionSchema = entitySchema;
export const targetSchema = entitySchema;

export const permissionAtomSchema = z.object({
  entity: entitySchema,
  action: actionSchema,
  target: targetSchema,
  /** When true, this atom grants the permission; when false, it denies. Optional, default true. */
  granted: z.boolean().optional(),
});

export const addPermissionItemSchema = permissionAtomSchema.extend({
  description: z.string().optional(),
  meta: z
    .record(z.string().min(1), z.string())
    .optional()
    .nullable()
    .or(z.null()),
});

export const addPermissionsSchema = z.object({
  projectId: z.string().min(1),
  permissions: z.array(addPermissionItemSchema),
});

export const entityQuerySchema = stringMetaQuerySchema.or(
  objPartQueryListSchema
);
export const actionQuerySchema = entityQuerySchema;
export const targetQuerySchema = entityQuerySchema;

export const permissionQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  entity: entityQuerySchema.optional(),
  action: actionQuerySchema.optional(),
  target: targetQuerySchema.optional(),
  groupId: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
  meta: objPartQueryListSchema.optional(),
});

/** Minimal schema for matching a permission to remove (entity, action, target,
 * optional granted). */
export const removePermissionMatchSchema = z.object({
  entity: entitySchema,
  action: actionSchema,
  target: targetSchema,
  granted: z.boolean().optional(),
});

export const updatePermissionsSchema = z.object({
  query: permissionQuerySchema,
  update: z.object({
    addPermissions: z.array(addPermissionItemSchema).optional(),
    removePermissions: z.array(removePermissionMatchSchema).optional(),
    removeAllPermissions: z.boolean().optional(),
  }),
  updateMany: z.boolean().optional(),
});

export const deletePermissionsSchema = z.object({
  query: permissionQuerySchema.optional(),
  /** When provided, delete in one pass (one deleteManyObjs per query). Use
   * instead of looping. */
  queries: z.array(permissionQuerySchema).optional(),
  deleteMany: z.boolean().optional(),
});

export const getPermissionsSchema = z.object({
  query: permissionQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export const checkPermissionItemSchema = z.object({
  entity: entitySchema,
  action: actionSchema,
  target: targetSchema,
  granted: z.boolean().optional(),
});

export const checkPermissionsSchema = z.object({
  projectId: z.string().min(1),
  items: z.array(checkPermissionItemSchema),
});

export type AddPermissionsEndpointArgs = z.infer<typeof addPermissionsSchema>;
export type UpdatePermissionsEndpointArgs = z.infer<
  typeof updatePermissionsSchema
>;
export type DeletePermissionsEndpointArgs = z.infer<
  typeof deletePermissionsSchema
>;
export type GetPermissionsEndpointArgs = z.infer<typeof getPermissionsSchema>;
export type CheckPermissionsEndpointArgs = z.infer<
  typeof checkPermissionsSchema
>;

export interface GetPermissionsEndpointResponse {
  permissions: IPermission[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CheckPermissionsEndpointResponse {
  results: {
    isPermitted: boolean;
  }[];
}

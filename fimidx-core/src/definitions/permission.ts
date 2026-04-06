import type { ValueOf } from "type-fest";
import { z } from "zod";
import {
  inputObjRecordSchema,
  numberMetaQuerySchema,
  objRecordQueryListSchema,
  objSortListSchema,
  onConflictSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export const kFimidxPermissionStrings = {
  wildcard: "*",
  groupRead: "group:read",
  groupMutate: "group:mutate",
  groupDelete: "group:delete",
  projectRead: "project:read",
  projectMutate: "project:mutate",
  projectDelete: "project:delete",
  memberRead: "member:read",
  memberReadPermissions: "member:readPermissions",
  memberMutate: "member:mutate",
  memberRemove: "member:remove",
  logRead: "log:read",
  logIngest: "log:ingest",
  clientTokenRead: "clientToken:read",
  clientTokenReadPermissions: "clientToken:readPermissions",
  clientTokenMutate: "clientToken:mutate",
  clientTokenDelete: "clientToken:delete",
  monitorRead: "monitor:read",
  monitorMutate: "monitor:mutate",
  monitorDelete: "monitor:delete",
  callbackRead: "callback:read",
  callbackMutate: "callback:mutate",
  callbackDelete: "callback:delete",
  sourceMapUpload: "sourceMap:upload",
  sourceMapRead: "sourceMap:read",
  objRead: "obj:read",
  objMutate: "obj:mutate",
  objDelete: "obj:delete",
  permissionRead: "permission:read",
  permissionMutate: "permission:mutate",
  permissionDelete: "permission:delete",
} as const;

export type TFimidxPermissionString = ValueOf<typeof kFimidxPermissionStrings>;

export const kFimidxPermissions = {
  wildcard: kFimidxPermissionStrings.wildcard,
  group: {
    read: kFimidxPermissionStrings.groupRead,
    mutate: kFimidxPermissionStrings.groupMutate,
    delete: kFimidxPermissionStrings.groupDelete,
  },
  project: {
    read: kFimidxPermissionStrings.projectRead,
    mutate: kFimidxPermissionStrings.projectMutate,
    delete: kFimidxPermissionStrings.projectDelete,
  },
  member: {
    read: kFimidxPermissionStrings.memberRead,
    readPermissions: kFimidxPermissionStrings.memberReadPermissions,
    mutate: kFimidxPermissionStrings.memberMutate,
    remove: kFimidxPermissionStrings.memberRemove,
  },
  log: {
    read: kFimidxPermissionStrings.logRead,
    ingest: kFimidxPermissionStrings.logIngest,
  },
  clientToken: {
    read: kFimidxPermissionStrings.clientTokenRead,
    readPermissions: kFimidxPermissionStrings.clientTokenReadPermissions,
    mutate: kFimidxPermissionStrings.clientTokenMutate,
    delete: kFimidxPermissionStrings.clientTokenDelete,
  },
  monitor: {
    read: kFimidxPermissionStrings.monitorRead,
    mutate: kFimidxPermissionStrings.monitorMutate,
    delete: kFimidxPermissionStrings.monitorDelete,
  },
  callback: {
    read: kFimidxPermissionStrings.callbackRead,
    mutate: kFimidxPermissionStrings.callbackMutate,
    delete: kFimidxPermissionStrings.callbackDelete,
  },
  sourceMap: {
    upload: kFimidxPermissionStrings.sourceMapUpload,
    read: kFimidxPermissionStrings.sourceMapRead,
  },
  obj: {
    read: kFimidxPermissionStrings.objRead,
    mutate: kFimidxPermissionStrings.objMutate,
    delete: kFimidxPermissionStrings.objDelete,
  },
  permission: {
    read: kFimidxPermissionStrings.permissionRead,
    mutate: kFimidxPermissionStrings.permissionMutate,
    delete: kFimidxPermissionStrings.permissionDelete,
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
  kFimidxPermissions.sourceMap.upload,
  kFimidxPermissions.sourceMap.read,
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

export const entitySchema = inputObjRecordSchema.or(z.string().min(1));
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
  meta: inputObjRecordSchema.optional().nullable().or(z.null()),
});

export const addPermissionsSchema = z.object({
  projectId: z.string().min(1),
  permissions: z.array(addPermissionItemSchema).max(100),
});

export const entityQuerySchema = stringMetaQuerySchema.or(
  objRecordQueryListSchema
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
  meta: objRecordQueryListSchema.optional(),
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
    meta: inputObjRecordSchema.optional(),
    addPermissions: z.array(addPermissionItemSchema).max(100).optional(),
    removePermissions: z.array(removePermissionMatchSchema).max(100).optional(),
    removeAllPermissions: z.boolean().optional(),
  }),
  updateMany: z.boolean().optional(),
  metaUpdateWay: onConflictSchema.optional(),
});

export const deletePermissionsSchema = z.object({
  query: permissionQuerySchema.optional(),
  /** When provided, delete in one pass (one deleteManyObjs per query). Use
   * instead of looping. */
  queries: z.array(permissionQuerySchema).max(100).optional(),
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
  items: z.array(checkPermissionItemSchema).max(100),
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

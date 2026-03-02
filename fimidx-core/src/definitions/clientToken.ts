import { z } from "zod";
import {
  numberMetaQuerySchema,
  objPartQueryListSchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";
import {
  actionQuerySchema,
  checkPermissionItemSchema,
  entityQuerySchema,
  permissionAtomSchema,
  targetQuerySchema,
} from "./permission.js";

export interface IClientToken {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByType: string;
  updatedBy: string;
  updatedByType: string;
  projectId: string;
  groupId: string;
  meta?: Record<string, string> | null;
  /** Permissions are null if reading other client tokens and user does not have
   * clientToken:readPermissions permission. */
  permissions: import("./permission.js").IPermissionAtom[] | null;
}

export interface IClientTokenObjRecord {
  name: string;
  description?: string | null;
  meta?: Record<string, string> | null;
  permissions: import("./permission.js").IPermissionAtom[] | null;
}

export interface IClientTokenObjRecordMeta
  extends NonNullable<import("./permission.js").IPermissionMeta> {
  __fimidx_managed_clientTokenId: string;
  __fimidx_managed_groupId: string;
}

export const addClientTokenSchema = z.object({
  groupId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  meta: z.record(z.string().min(1), z.string()).optional(),
  permissions: z.array(permissionAtomSchema).optional(),
});

export const clientTokenQuerySchema = z.object({
  projectId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  name: stringMetaQuerySchema.optional(),
  meta: objPartQueryListSchema.optional(),
  permissionEntity: entityQuerySchema.optional(),
  permissionAction: actionQuerySchema.optional(),
  permissionTarget: targetQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
});

export const updateClientTokensSchema = z.object({
  update: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    meta: z.record(z.string().min(1), z.string()).optional(),
    permissions: z.array(permissionAtomSchema).optional(),
  }),
  query: clientTokenQuerySchema,
  updateMany: z.boolean().optional(),
});

export const updateClientTokenPermissionsSchema = z.object({
  query: z.object({
    id: z.string().min(1),
    groupId: z.string().min(1),
    projectId: z.string().min(1),
  }),
  update: z.object({
    permissions: z.array(permissionAtomSchema),
  }),
});

export const addClientTokenPermissionsSchema = z.object({
  groupId: z.string().min(1),
  projectId: z.string().min(1),
  permissions: z.array(permissionAtomSchema),
  clientTokenId: z.string().min(1),
});

export const deleteClientTokensSchema = z.object({
  query: clientTokenQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const getClientTokensSchema = z.object({
  query: clientTokenQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
  includePermissions: z.boolean().optional(),
});

export const encodeClientTokenJWTSchema = z.object({
  id: z.string().min(1),
  refresh: z.boolean().optional(),
  expiresAt: z.date().optional(),
});

export const refreshClientTokenJWTSchema = z.object({
  refreshToken: z.string().min(1),
});

export const checkClientTokenPermissionsSchema = z.object({
  projectId: z.string().min(1),
  clientTokenId: z.string().min(1),
  groupId: z.string().min(1),
  items: z.array(checkPermissionItemSchema),
});

export type AddClientTokenEndpointArgs = z.infer<typeof addClientTokenSchema>;
export type UpdateClientTokensEndpointArgs = z.infer<
  typeof updateClientTokensSchema
>;
export type UpdateClientTokenPermissionsEndpointArgs = z.infer<
  typeof updateClientTokenPermissionsSchema
>;
export type AddClientTokenPermissionsEndpointArgs = z.infer<
  typeof addClientTokenPermissionsSchema
>;
export type DeleteClientTokensEndpointArgs = z.infer<
  typeof deleteClientTokensSchema
>;
export type GetClientTokensEndpointArgs = z.infer<typeof getClientTokensSchema>;
export type EncodeClientTokenJWTEndpointArgs = z.infer<
  typeof encodeClientTokenJWTSchema
>;
export type RefreshClientTokenJWTEndpointArgs = z.infer<
  typeof refreshClientTokenJWTSchema
>;
export type CheckClientTokenPermissionsEndpointArgs = z.infer<
  typeof checkClientTokenPermissionsSchema
>;

export interface AddClientTokenEndpointResponse {
  clientToken: IClientToken;
}

export interface GetClientTokensEndpointResponse {
  clientTokens: IClientToken[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UpdateClientTokenPermissionsEndpointResponse {
  clientToken: IClientToken;
}

export interface AddClientTokenPermissionsEndpointResponse {
  permissions: import("./permission.js").IPermission[];
}

export interface EncodeClientTokenJWTEndpointResponse {
  token: string;
  refreshToken?: string;
}

export interface RefreshClientTokenJWTEndpointResponse {
  token: string;
  refreshToken?: string;
}

export interface CheckClientTokenPermissionsEndpointResponse {
  results: {
    hasPermission: boolean;
  }[];
}

export interface UpdateClientTokensEndpointResponse {
  success: boolean;
}
